alter table "public"."user_task" add constraint "user_task_user_id_task_id_key" unique ("user_id", "task_id");
