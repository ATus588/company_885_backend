alter table "public"."projects"
  add constraint "projects_parent_project_fkey"
  foreign key ("parent_project")
  references "public"."projects"
  ("id") on update restrict on delete cascade;
