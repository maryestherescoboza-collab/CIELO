import Header from '@editorjs/header';
import NestedList from '@editorjs/nested-list';
import Checklist from '@editorjs/checklist';
import Quote from '@editorjs/quote';
import Delimiter from '@editorjs/delimiter';
import ImageTool from '@editorjs/image';
import Table from '@editorjs/table';
import LinkTool from '@editorjs/link';
import Embed from '@editorjs/embed';
import Paragraph from '@editorjs/paragraph';

import { requestGoogleAccessToken, getNotasFolderId, uploadToDrive } from '../../lib/googleDrive';

export {
  Header,
  NestedList,
  Checklist,
  Quote,
  Delimiter,
  ImageTool,
  Table,
  LinkTool,
  Embed,
  Paragraph,
};

export function getEditorTools(): Record<string, unknown> {
  return {
    paragraph: {
      class: Paragraph,
      inlineToolbar: true,
      config: { placeholder: 'Escribe tu clase…' },
    },
    header: {
      class: Header,
      inlineToolbar: true,
      config: {
        levels: [2, 3],
        defaultLevel: 2,
        placeholder: 'Título',
      },
    },
    list: {
      class: NestedList,
      inlineToolbar: true,
      config: { defaultStyle: 'unordered' },
    },
    checklist: {
      class: Checklist,
      inlineToolbar: true,
    },
    quote: {
      class: Quote,
      inlineToolbar: true,
      config: { placeholder: 'Cita o idea clave…' },
    },
    delimiter: {
      class: Delimiter,
    },
    image: {
      class: ImageTool,
      inlineToolbar: true,
      config: {
        placeholder: 'Pega la URL de la imagen',
        captionPlaceholder: 'Descripción',
        uploader: {
          uploadByFile: async (file: File) => {
            try {
              const token = await requestGoogleAccessToken();
              const folderId = await getNotasFolderId(token);
              const result = await uploadToDrive(file, file.name, folderId, token);
              const driveFileId = result.fileId;
              return {
                success: 1,
                file: {
                  url: `https://drive.google.com/uc?export=view&id=${driveFileId}`
                }
              };
            } catch (err) {
              console.error('Error al subir imagen a Drive:', err);
              return { success: 0 };
            }
          }
        }
      },
    },
    table: {
      class: Table,
      inlineToolbar: true,
      config: { withHeadings: true },
    },
    linkTool: {
      class: LinkTool,
      inlineToolbar: true,
      config: {
        placeholder: 'Pega un enlace para guardarlo como recurso',
      },
    },
    embed: {
      class: Embed,
      inlineToolbar: true,
      config: {
        services: {
          youtube: true,
          vimeo: true,
          figma: true,
          codepen: true,
        },
      },
    },
  };
}