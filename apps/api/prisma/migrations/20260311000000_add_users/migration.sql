-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "keycloak_id" TEXT NOT NULL,
    "nickname" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "age" TEXT,
    "gender" TEXT,
    "invest_exp" TEXT,
    "invest_style" TEXT,
    "show_age" BOOLEAN NOT NULL DEFAULT false,
    "show_gender" BOOLEAN NOT NULL DEFAULT false,
    "show_invest_exp" BOOLEAN NOT NULL DEFAULT false,
    "show_invest_style" BOOLEAN NOT NULL DEFAULT false,
    "third_party_consent" BOOLEAN NOT NULL DEFAULT false,
    "consent_at" TIMESTAMP(3),
    "consent_revoked_at" TIMESTAMP(3),
    "provider" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_keycloak_id_key" ON "users"("keycloak_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");
