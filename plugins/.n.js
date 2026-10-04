import {
  downloadContentFromMessage
} from '@whiskeysockets/baileys';

export default {
  command: ['n'],
  category: 'group',
  description: 'Menciona a todos los miembros del grupo',

  run: async (sock, msg, args, context) => {
    const { chatId } = context;

    if (!chatId.endsWith('@g.us')) {
      return sock.sendMessage(chatId, {
        text: '❌ Este comando solo puede usarse en grupos.'
      }, { quoted: msg });
    }

    const metadata = await sock.groupMetadata(chatId);
    const participants = metadata.participants;
    const mentions = participants.map(p => p.id);

    const texto = args.join(' ').trim();

    // Buscar mensaje citado
    const message = msg?.message;
    const contextInfo =
      message?.extendedTextMessage?.contextInfo ||
      message?.imageMessage?.contextInfo ||
      message?.videoMessage?.contextInfo ||
      message?.audioMessage?.contextInfo ||
      message?.documentMessage?.contextInfo ||
      message?.stickerMessage?.contextInfo;

    const quoted = contextInfo?.quotedMessage;

    // ─────────────────────────────
    // .n TEXTO
    // ─────────────────────────────
    if (texto) {
      await sock.sendMessage(chatId, {
        text: texto,
        mentions
      }, { quoted: msg });

      return;
    }

    // ─────────────────────────────
    // .n RESPONDIENDO A MULTIMEDIA
    // ─────────────────────────────
    if (quoted) {
      try {
        // IMAGEN
        if (quoted.imageMessage) {
          const stream = await downloadContentFromMessage(
            quoted.imageMessage,
            'image'
          );

          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }

          const buffer = Buffer.concat(chunks);

          await sock.sendMessage(chatId, {
            image: buffer,
            caption: quoted.imageMessage.caption || '',
            mentions
          }, { quoted: msg });

          return;
        }

        // VIDEO
        if (quoted.videoMessage) {
          const stream = await downloadContentFromMessage(
            quoted.videoMessage,
            'video'
          );

          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }

          const buffer = Buffer.concat(chunks);

          await sock.sendMessage(chatId, {
            video: buffer,
            caption: quoted.videoMessage.caption || '',
            mentions,
            mimetype: quoted.videoMessage.mimetype
          }, { quoted: msg });

          return;
        }

        // AUDIO
        if (quoted.audioMessage) {
          const stream = await downloadContentFromMessage(
            quoted.audioMessage,
            'audio'
          );

          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }

          const buffer = Buffer.concat(chunks);

          await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: quoted.audioMessage.mimetype || 'audio/mp4',
            ptt: quoted.audioMessage.ptt || false,
            mentions
          }, { quoted: msg });

          return;
        }

        // STICKER
        if (quoted.stickerMessage) {
          const stream = await downloadContentFromMessage(
            quoted.stickerMessage,
            'sticker'
          );

          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }

          const buffer = Buffer.concat(chunks);

          await sock.sendMessage(chatId, {
            sticker: buffer,
            mentions
          }, { quoted: msg });

          return;
        }

        // DOCUMENTO
        if (quoted.documentMessage) {
          const stream = await downloadContentFromMessage(
            quoted.documentMessage,
            'document'
          );

          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }

          const buffer = Buffer.concat(chunks);

          await sock.sendMessage(chatId, {
            document: buffer,
            mimetype: quoted.documentMessage.mimetype,
            fileName: quoted.documentMessage.fileName || 'documento',
            caption: quoted.documentMessage.caption || '',
            mentions
          }, { quoted: msg });

          return;
        }

        // TEXTO CITADO
        const quotedText =
          quoted.conversation ||
          quoted.extendedTextMessage?.text;

        if (quotedText) {
          await sock.sendMessage(chatId, {
            text: quotedText,
            mentions
          }, { quoted: msg });

          return;
        }

      } catch (error) {
        console.error('[.n] Error reenviando multimedia:', error);

        await sock.sendMessage(chatId, {
          text: '❌ No pude reenviar ese archivo.'
        }, { quoted: msg });

        return;
      }
    }

    // ─────────────────────────────
    // SIN TEXTO NI MENSAJE CITADO
    // ─────────────────────────────
    await sock.sendMessage(chatId, {
      text: '❌ Escribe un mensaje o responde a una imagen, audio, video, sticker o documento.\n\nEjemplos:\n.n Hola a todos 👋\n\nO responde a una imagen con:\n.n'
    }, { quoted: msg });
  }
};