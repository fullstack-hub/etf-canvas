-- CreateTable
CREATE TABLE "post_category" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "post_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" VARCHAR(5000) NOT NULL,
    "portfolio_id" UUID,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "author_id" TEXT NOT NULL,
    "parent_id" UUID,
    "content" VARCHAR(1000) NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_like" (
    "id" SERIAL NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_like" (
    "id" SERIAL NOT NULL,
    "comment_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_view" (
    "id" SERIAL NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_view_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_category_slug_key" ON "post_category"("slug");

-- CreateIndex
CREATE INDEX "post_category_id_created_at_idx" ON "post"("category_id", "created_at" DESC);
CREATE INDEX "post_created_at_idx" ON "post"("created_at" DESC);
CREATE INDEX "post_like_count_idx" ON "post"("like_count" DESC);
CREATE INDEX "post_author_id_idx" ON "post"("author_id");

-- CreateIndex
CREATE INDEX "comment_post_id_created_at_idx" ON "comment"("post_id", "created_at");
CREATE INDEX "comment_parent_id_idx" ON "comment"("parent_id");
CREATE INDEX "comment_author_id_idx" ON "comment"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_like_post_id_user_id_key" ON "post_like"("post_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "comment_like_comment_id_user_id_key" ON "comment_like"("comment_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_view_post_id_user_id_key" ON "post_view"("post_id", "user_id");

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("keycloak_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "post" ADD CONSTRAINT "post_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "post_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comment" ADD CONSTRAINT "comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("keycloak_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comment" ADD CONSTRAINT "comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_like" ADD CONSTRAINT "post_like_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_like" ADD CONSTRAINT "comment_like_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed categories
INSERT INTO "post_category" ("slug", "name", "sort_order") VALUES
    ('general', '일반', 0),
    ('portfolio-review', '포트폴리오 리뷰', 1);
