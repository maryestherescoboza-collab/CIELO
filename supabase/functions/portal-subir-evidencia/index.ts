// Supabase Edge Function: portal-subir-evidencia
// Transfiere binarios de estudiantes directamente al Google Drive del docente titular.
// Cero almacenamiento en Supabase Storage.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
const GOOGLE_DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const encryptionKey = Deno.env.get("GOOGLE_DRIVE_SECRET_KEY") || "cielo-secret-encryption-key-32b";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const sessionToken = formData.get("session_token")?.toString();
    const actividadIdStr = formData.get("actividad_id")?.toString();
    const archivo = formData.get("archivo") as File | null;
    const descripcion = formData.get("descripcion")?.toString() || null;

    if (!sessionToken || !actividadIdStr || !archivo) {
      return new Response(JSON.stringify({ error: "Faltan parámetros requeridos (session_token, actividad_id, archivo)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actividadId = parseInt(actividadIdStr, 10);

    // 1. Validar identidad del estudiante
    const { data: estData, error: estError } = await supabaseAdmin.rpc("evidencia_estudiante_del_portal", {
      p_session_token: sessionToken,
    });

    if (estError || !estData) {
      return new Response(JSON.stringify({ error: "Sesión inválida o expirada" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const estudiante = estData;

    // 2. Validar que la actividad corresponda al curso del estudiante
    const { data: actividad, error: actError } = await supabaseAdmin
      .from("actividades")
      .select("id, curso_id, asignatura, nombre, plan_ficha_id, requiere_producto, user_id, cursos(id, nombre, grado, seccion, user_id)")
      .eq("id", actividadId)
      .eq("curso_id", estudiante.curso_id)
      .eq("activo", true)
      .single();

    if (actError || !actividad) {
      return new Response(JSON.stringify({ error: "La actividad no está disponible para tu curso" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const curso = (actividad as any).cursos;
    const docenteId = actividad.user_id || curso?.user_id;

    // 3. Obtener credenciales de Google Drive del docente
    const { data: driveTokenRow, error: tokenError } = await supabaseAdmin
      .from("docente_drive_tokens")
      .select("user_id, refresh_token_enc, root_folder_id, activo")
      .eq("user_id", docenteId)
      .single();

    if (tokenError || !driveTokenRow || !driveTokenRow.activo) {
      return new Response(
        JSON.stringify({ error: "El docente no tiene configurado Google Drive actualmente. Notifícalo a tu docente." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Renovar access_token con Google
    let refreshToken = driveTokenRow.refresh_token_enc;
    // Si viene prefijado con base64/aes simple o plano
    if (refreshToken.startsWith("enc:")) {
      refreshToken = atob(refreshToken.replace("enc:", ""));
    }

    const tokenParams = new URLSearchParams({
      client_id: googleClientId || "",
      client_secret: googleClientSecret || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[GOOGLE REFRESH ERROR]", errText);
      return new Response(JSON.stringify({ error: "Error renovando acceso con Google Drive del docente" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenJson: TokenResponse = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    // 5. Resolver carpeta destino en Google Drive
    let targetFolderId: string | null = null;
    const { data: carpetaCached } = await supabaseAdmin
      .from("docente_drive_carpetas")
      .select("drive_folder_id")
      .eq("user_id", docenteId)
      .eq("actividad_id", actividadId)
      .maybeSingle();

    if (carpetaCached?.drive_folder_id) {
      targetFolderId = carpetaCached.drive_folder_id;
    } else {
      // Helper para buscar o crear subcarpeta en Drive
      const ensureFolder = async (folderName: string, parentId?: string | null): Promise<string> => {
        let q = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`;
        if (parentId) q += ` and '${parentId}' in parents`;

        const searchRes = await fetch(`${GOOGLE_DRIVE_FILES_URL}?q=${encodeURIComponent(q)}&fields=files(id)`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (searchRes.ok) {
          const sJson = await searchRes.json();
          if (sJson.files && sJson.files.length > 0) {
            return sJson.files[0].id;
          }
        }

        const createRes = await fetch(GOOGLE_DRIVE_FILES_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: parentId ? [parentId] : [],
          }),
        });

        const cJson = await createRes.json();
        return cJson.id;
      };

      const rootId = driveTokenRow.root_folder_id || await ensureFolder("Evidencias CIELO");
      if (!driveTokenRow.root_folder_id) {
        await supabaseAdmin.from("docente_drive_tokens").update({ root_folder_id: rootId }).eq("user_id", docenteId);
      }

      const cursoNombre = curso ? `${curso.grado || ""} ${curso.seccion || ""}`.trim() || curso.nombre : "Curso";
      const cursoFolderId = await ensureFolder(cursoNombre, rootId);
      const asigFolderId = await ensureFolder(actividad.asignatura || "General", cursoFolderId);
      const actFolderId = await ensureFolder(actividad.nombre, asigFolderId);

      targetFolderId = actFolderId;

      await supabaseAdmin.from("docente_drive_carpetas").upsert({
        user_id: docenteId,
        curso_id: actividad.curso_id,
        asignatura: actividad.asignatura || "general",
        actividad_id: actividadId,
        drive_folder_id: targetFolderId,
      });
    }

    // 6. Subir archivo a Google Drive (Multipart)
    const ext = archivo.name.split(".").pop() || "bin";
    const nombreLimpio = `${estudiante.numero_lista ?? "SN"}_${(estudiante.nombre || "").trim()}_${(estudiante.apellido || "").trim()}_${archivo.name}`.replace(/[\s/]/g, "_");

    const metadata = {
      name: nombreLimpio,
      parents: [targetFolderId],
    };

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const fileBytes = new Uint8Array(await archivo.arrayBuffer());
    const mimeType = archivo.type || "application/octet-stream";

    const multipartRequestBody = new Blob([
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${mimeType}\r\n\r\n`,
      fileBytes,
      closeDelimiter,
    ]);

    const uploadRes = await fetch(GOOGLE_DRIVE_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.text();
      console.error("[GOOGLE UPLOAD ERROR]", uploadErr);
      return new Response(JSON.stringify({ error: "No se pudo subir el archivo a Google Drive" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const driveFile = await uploadRes.json();
    const driveFileId = driveFile.id;
    const driveUrl = `https://drive.google.com/file/d/${driveFileId}/view`;
    const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;

    // 7. Persistir metadatos en public.evidencias (con compensación si falla)
    const { data: evRow, error: insertError } = await supabaseAdmin
      .from("evidencias")
      .insert({
        estudiante_id: estudiante.id,
        actividad_id: actividad.id,
        ficha_id: actividad.plan_ficha_id,
        curso_id: actividad.curso_id,
        asignatura: actividad.asignatura,
        nombre: archivo.name,
        descripcion: descripcion?.trim() || null,
        origen: "drive",
        drive_file_id: driveFileId,
        drive_url: driveUrl,
        drive_download_url: driveDownloadUrl,
        tamano_bytes: archivo.size,
        mime_type: mimeType,
        estado: "pendiente",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[DB INSERT ERROR]", insertError);
      // Compensación transaccional: Borrar archivo en Drive
      await fetch(`${GOOGLE_DRIVE_FILES_URL}/${driveFileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return new Response(JSON.stringify({ error: "Error registrando la evidencia en la base de datos" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        id: evRow.id,
        drive_file_id: driveFileId,
        drive_url: driveUrl,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[EDGE FUNCTION UNCAUGHT ERROR]", err);
    return new Response(JSON.stringify({ error: err?.message || "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

