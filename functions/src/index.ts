import {onDocumentCreated, onDocumentUpdated, onDocumentDeleted} from "firebase-functions/v2/firestore";
import * as functions from "firebase-functions";
import {google} from "googleapis";
import * as admin from "firebase-admin";
import * as serviceAccountCredentials from "../service-account.json";

admin.initializeApp();

const SPREADSHEET_ID = "1X3gLoo5JfGAhvHhEVsHdm57FI4kdTBmiQ57DQ-H0p7s";
const PRECIO_VIP = 40;
const PRECIO_GENERAL = 25;

// --- FUNCIÓN 1: SE EJECUTA CUANDO SE CREA UN NUEVO TICKET ---
export const registrarTicketEnSheet = onDocumentCreated(
    {
      document: "tickets/{ticketId}",
      timeoutSeconds: 60,
    },
    async (event) => {
      const snap = event.data;
      if (!snap) {
        functions.logger.error("No hay datos asociados al evento de creación.");
        return;
      }
      
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: serviceAccountCredentials.client_email,
            private_key: serviceAccountCredentials.private_key,
          },
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        const sheets = google.sheets({version: "v4", auth});
        
        const ticketData = snap.data();
        const {vendedorNombre, numeroTicket, tipo, nombreComprador, estado} = ticketData;

        // Calcula el monto basado en el estado y tipo del ticket
        const monto = estado === "PAGADO" ? (tipo === "VIP" ? PRECIO_VIP : PRECIO_GENERAL) : 0;

        functions.logger.info(`Nuevo ticket registrado: ${numeroTicket}`);

        // Tarea Única: Actualizar la hoja del tipo de Ticket (VIP o General)
        const targetSheet = tipo === "VIP" ? "Tickets VIP" : "Tickets General";
        const ticketsColumn = await sheets.spreadsheets.values.get({spreadsheetId: SPREADSHEET_ID, range: `${targetSheet}!A:A`});
        const ticketList = ticketsColumn.data.values || [];
        const ticketRowIndex = ticketList.findIndex((row) => row && row[0] === numeroTicket);

        if (ticketRowIndex !== -1) {
          const targetRow = ticketRowIndex + 1;
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${targetSheet}!B${targetRow}:F${targetRow}`, // Rango extendido hasta la columna F
            valueInputOption: "USER_ENTERED",
            requestBody: {values: [[
              vendedorNombre, 
              new Date().toLocaleString("es-PE", {timeZone: "America/Lima"}),
              nombreComprador,
              estado,
              monto, // Escribe el monto en la columna F
            ]]},
          });
        } else {
          functions.logger.warn(`Ticket ${numeroTicket} no fue encontrado en la hoja '${targetSheet}'.`);
        }
      } catch (error) {
        functions.logger.error("Error al escribir en Google Sheet durante la creación:", error);
      }
    });

// --- FUNCIÓN 2: SE EJECUTA CUANDO UN TICKET EXISTENTE SE ACTUALIZA ---
export const actualizarTicketEnSheet = onDocumentUpdated(
    {
      document: "tickets/{ticketId}",
      timeoutSeconds: 60,
    },
    async (event) => {
      if (!event.data) {
        functions.logger.error("No hay datos asociados al evento de actualización.");
        return;
      }

      const dataAntes = event.data.before.data();
      const dataDespues = event.data.after.data();

      try {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: serviceAccountCredentials.client_email,
            private_key: serviceAccountCredentials.private_key,
          },
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        const sheets = google.sheets({version: "v4", auth});

        // Calcula el monto basado en los datos DESPUÉS del cambio
        const monto = dataDespues.estado === "PAGADO" ? (dataDespues.tipo === "VIP" ? PRECIO_VIP : PRECIO_GENERAL) : 0;

        // Caso 1: El tipo de ticket cambió (ej: de VIP a GEN)
        if (dataAntes.numeroTicket !== dataDespues.numeroTicket) {
          functions.logger.info(`El ticket cambió de ${dataAntes.numeroTicket} a ${dataDespues.numeroTicket}. Actualizando Google Sheet.`);
          
          const hojaAntigua = dataAntes.tipo === "VIP" ? "Tickets VIP" : "Tickets General";
          const ticketsColumnaAntigua = await sheets.spreadsheets.values.get({spreadsheetId: SPREADSHEET_ID, range: `${hojaAntigua}!A:A`});
          const listaTicketsAntigua = ticketsColumnaAntigua.data.values || [];
          const filaAntiguaIndex = listaTicketsAntigua.findIndex((row) => row && row[0] === dataAntes.numeroTicket);

          if (filaAntiguaIndex !== -1) {
            const filaAntigua = filaAntiguaIndex + 1;
            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: `${hojaAntigua}!B${filaAntigua}:F${filaAntigua}`, // Rango extendido hasta la columna F
              valueInputOption: "RAW",
              requestBody: {values: [["", "", "", "", ""]]}, // 5 valores vacíos
            });
          }

          const hojaNueva = dataDespues.tipo === "VIP" ? "Tickets VIP" : "Tickets General";
          const ticketsColumnaNueva = await sheets.spreadsheets.values.get({spreadsheetId: SPREADSHEET_ID, range: `${hojaNueva}!A:A`});
          const listaTicketsNueva = ticketsColumnaNueva.data.values || [];
          const filaNuevaIndex = listaTicketsNueva.findIndex((row) => row && row[0] === dataDespues.numeroTicket);

          if (filaNuevaIndex !== -1) {
            const filaNueva = filaNuevaIndex + 1;
            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: `${hojaNueva}!B${filaNueva}:F${filaNueva}`, // Rango extendido hasta la columna F
              valueInputOption: "USER_ENTERED",
              requestBody: {values: [[
                dataDespues.vendedorNombre, 
                new Date().toLocaleString("es-PE", {timeZone: "America/Lima"}),
                dataDespues.nombreComprador,
                dataDespues.estado,
                monto,
              ]]},
            });
          }
        } 
        // Caso 2: El tipo de ticket NO cambió, pero otros datos sí
        else {
          functions.logger.info(`Actualizando datos para el ticket ${dataDespues.numeroTicket}.`);
          const hojaActual = dataDespues.tipo === "VIP" ? "Tickets VIP" : "Tickets General";
          const ticketsColumna = await sheets.spreadsheets.values.get({spreadsheetId: SPREADSHEET_ID, range: `${hojaActual}!A:A`});
          const ticketList = ticketsColumna.data.values || [];
          const ticketRowIndex = ticketList.findIndex((row) => row && row[0] === dataDespues.numeroTicket);

          if (ticketRowIndex !== -1) {
            const filaActual = ticketRowIndex + 1;
            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: `${hojaActual}!B${filaActual}:F${filaActual}`, // Rango extendido hasta la columna F
              valueInputOption: "USER_ENTERED",
              requestBody: {values: [[
                dataDespues.vendedorNombre, 
                dataAntes.fechaRegistro.toDate().toLocaleString("es-PE", {timeZone: "America/Lima"}),
                dataDespues.nombreComprador,
                dataDespues.estado,
                monto,
              ]]},
            });
          }
        }
        
        functions.logger.info(`Actualización en Sheet completada para ${dataDespues.numeroTicket}.`);

      } catch (error) {
        functions.logger.error("Error al actualizar Google Sheet tras una edición:", error);
      }
    },
);

// --- FUNCIÓN 3: SE EJECUTA CUANDO UN TICKET SE BORRA ---
export const borrarTicketEnSheet = onDocumentDeleted(
    {
      document: "tickets/{ticketId}",
      timeoutSeconds: 60,
    },
    async (event) => {
      if (!event.data) {
        functions.logger.error("No se encontraron datos en el evento de borrado.");
        return;
      }
      const deletedData = event.data.data();
      if (!deletedData) {
        functions.logger.warn("El documento borrado no contenía datos.");
        return;
      }

      const numeroTicketCompleto = deletedData.numeroTicket;
      const tipoTicket = deletedData.tipo;

      functions.logger.info(`El ticket ${numeroTicketCompleto} fue borrado. Limpiando Google Sheet.`);

      try {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: serviceAccountCredentials.client_email,
            private_key: serviceAccountCredentials.private_key,
          },
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        const sheets = google.sheets({version: "v4", auth});

        // Tarea Única: Limpiar la fila en la hoja del tipo de Ticket
        const targetSheet = tipoTicket === "VIP" ? "Tickets VIP" : "Tickets General";
        const ticketsColumn = await sheets.spreadsheets.values.get({spreadsheetId: SPREADSHEET_ID, range: `${targetSheet}!A:A`});
        const ticketList = ticketsColumn.data.values || [];
        const ticketRowIndex = ticketList.findIndex((row) => row && row[0] === numeroTicketCompleto);

        if (ticketRowIndex !== -1) {
          const targetRow = ticketRowIndex + 1;
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${targetSheet}!B${targetRow}:F${targetRow}`, // Rango extendido hasta la columna F
            valueInputOption: "RAW",
            requestBody: {values: [["", "", "", "", ""]]}, // 5 valores vacíos
          });
        }
        
        functions.logger.info(`Limpieza en Sheet completada para el ticket borrado ${numeroTicketCompleto}.`);

      } catch (error) {
        functions.logger.error("Error al limpiar Google Sheet tras un borrado:", error);
      }
    },
);