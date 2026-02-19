-- AlterTable
ALTER TABLE "RecommendationSettings" ADD COLUMN     "includeAnime" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "includeCartoon" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "includeMovie" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "includeTv" BOOLEAN NOT NULL DEFAULT true;
