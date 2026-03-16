-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FileAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "messageId" TEXT,
    CONSTRAINT "FileAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FileAttachment" ("id", "messageId", "name", "size", "type", "url") SELECT "id", "messageId", "name", "size", "type", "url" FROM "FileAttachment";
DROP TABLE "FileAttachment";
ALTER TABLE "new_FileAttachment" RENAME TO "FileAttachment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
