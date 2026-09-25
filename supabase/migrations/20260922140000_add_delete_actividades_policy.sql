-- Add DELETE policy for actividades table allowing course teachers to delete their activities
CREATE POLICY "co_teacher_delete_actividades" 
ON public.actividades 
FOR DELETE 
TO public 
USING (public.is_course_teacher(curso_id));
