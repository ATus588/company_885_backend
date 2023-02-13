alter table "public"."news_comment"
  add constraint "news_comment_news_id_fkey"
  foreign key ("news_id")
  references "public"."news"
  ("id") on update restrict on delete cascade;
