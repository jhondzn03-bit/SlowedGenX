import { downloadMediaMessage } from "../media.js";

function detectarMedia(msg) {
  // Media enviada directamente
  const directo =
    msg.message?.imageMessage ||
    msg.message?.videoMessage ||
    msg.message?.audioMessage ||
    msg.message?.documentMessage ||
    msg.message?.stickerMessage;

  if (directo) {
    const tipo =
      msg.message.imageMessage ? "image" :
      msg.message.videoMessage ? "video" :
      msg.message.audioMessage ? "audio" :
      msg.message.documentMessage ? "document" :
      "sticker";

    return {
      mensajeParaDescargar: msg,
      media: directo,
      tipo
    };
  }

  // Media de un mensaje respondido
  const info = msg.message?.extendedTextMessage?.contextInfo;
  const citado = info?.quotedMessage;

  if (!citado) return null;

  const media =
    citado.imageMessage ||
    citado.videoMessage ||
    citado.audioMessage ||
    citado.documentMessage ||
    citado.stickerMessage;

  if (!media) return null;

  const tipo =
    citado.imageMessage ? "image" :
    citado.videoMessage ? "video" :
    citado.audioMessage ? "audio" :
    citado.documentMessage ? "document" :
    "sticker";

  return {
    mensajeParaDescargar: {
      message: citado,
      key: {
        remoteJid: null,
        id: info.stanzaId,
        participant: info.participant
      }
    },
    media,
    tipo
  };
}

export default {
  command: ["n"],
  category: "group",
  description: "Menciona a todos los miembros del grupo",

  run: async (sock, msg, args, context) => {
    const { chatId } = context;

    if (!chatId.endsWith("@g.us")) {
      return sock.sendMessage(chatId, {
        text: "❌ Este comando solo puede usarse en grupos."
      }, { quoted: msg });
    }

    const metadata = await sock.groupMetadata(chatId);
    const participants = metadata.participants;
    const mentions = participants.map(p => p.id);

    const texto = args.join(" ").trim();

    // .n TEXTO
    if (texto) {
      await sock.sendMessage(chatId, {
        text: texto,
        mentions
      }, { quoted: msg });

      return;
    }

    // .n RESPONDIENDO A MEDIA
    const encontrado = detectarMedia(msg);

    if (encontrado) {
      try {
        const {
          mensajeParaDescargar,
          media,
          tipo
        } = encontrado;

        if (mensajeParaDescargar.key) {
          mensajeParaDescargar.key.remoteJid = chatId;
        }

        const buffer = await downloadMediaMessage(
          mensajeParaDescargar,
          tipo
        );

        // IMAGEN
        if (tipo === "image") {
          await sock.sendMessage(chatId, {
            image: buffer,
            caption: media.caption || "",
            mentions
          }, { quoted: msg });

          return;
        }

        // VIDEO
        if (tipo === "video") {
          await sock.sendMessage(chatId, {
            video: buffer,
            caption: media.caption || "",
            mentions
          }, { quoted: msg });

          return;
        }

        // AUDIO
        if (tipo === "audio") {
          await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: media.mimetype || "audio/mp4",
            ptt: media.ptt || false
          }, { quoted: msg });

          return;
        }

        // STICKER
        if (tipo === "sticker") {
          await sock.sendMessage(chatId, {
            sticker: buffer
          }, { quoted: msg });

          return;
        }

        // DOCUMENTO
        if (tipo === "document") {
          await sock.sendMessage(chatId, {
            document: buffer,
            mimetype: media.mimetype,
            fileName: media.fileName || "documento"
          }, { quoted: msg });

          return;
        }

      } catch (error) {
        console.error("[.n] Error reenviando media:", error);

        await sock.sendMessage(chatId, {
          text: "❌ No pude reenviar ese archivo."
        }, { quoted: msg });

        return;
      }
    }

    // .n sin texto ni respuesta
    await sock.sendMessage(chatId, {
      text: "❌ Escribe un mensaje o responde a una imagen, audio, video, sticker o documento."
    }, { quoted: msg });
  }
};