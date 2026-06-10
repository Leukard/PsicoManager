const { google } = require("googleapis");
const oauth2Client =
require("../config/google");

async function criarEventoGoogle(
tokens,
titulo,
descricao,
inicio,
fim
){

try{
oauth2Client.setCredentials(tokens);
const calendar =
google.calendar({
version:"v3",
auth:oauth2Client
});

const evento =
await calendar.events.insert({
calendarId:"primary",
requestBody:{
summary: titulo,
description: descricao,
start:{
dateTime: inicio
},
end:{
dateTime: fim
},



// LEMBRETES AUTOMÁTICOS

reminders:{
useDefault:false,
overrides:[
{ method:"email",
minutes:60
},
{
method:"popup",
minutes:30
}]
}
}
});

return evento.data.id;
}catch(error){
console.error(
"Erro ao criar evento Google:",
error.message
);
throw error;
}
}

async function listarEventosGoogle(tokens) {
    try {
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({
            version: "v3",
            auth: oauth2Client
        });

        const res = await calendar.events.list({
            calendarId: "primary",
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: "startTime",
        });

        return res.data.items;
    } catch (error) {
        console.error("Erro ao listar eventos Google:", error.message);
        throw error;
    }
}

async function deletarEventoGoogle(tokens, eventId) {
    try {
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({
            version: "v3",
            auth: oauth2Client
        });

        await calendar.events.delete({
            calendarId: "primary",
            eventId: eventId,
        });
        return true;
    } catch (error) {
        console.error("Erro ao excluir evento Google:", error.message);
        throw error;
    }
}

async function atualizarEventoGoogle(tokens, eventId, titulo, descricao, inicio, fim) {
    try {
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({
            version: "v3",
            auth: oauth2Client
        });

        const evento = await calendar.events.update({
            calendarId: "primary",
            eventId: eventId,
            requestBody: {
                summary: titulo,
                description: descricao,
                start: { dateTime: inicio },
                end: { dateTime: fim },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: "email", minutes: 60 },
                        { method: "popup", minutes: 30 }
                    ]
                }
            }
        });

        return evento.data;
    } catch (error) {
        console.error("Erro ao atualizar evento Google:", error.message);
        throw error;
    }
}

module.exports = {
    criarEventoGoogle,
    listarEventosGoogle,
    deletarEventoGoogle,
    atualizarEventoGoogle
};