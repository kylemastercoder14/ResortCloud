import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  roomImageUploader: f({
    image: {
      maxFileCount: 8,
      maxFileSize: "4MB",
    },
  })
    .middleware(async () => ({ uploadedBy: "tenant" }))
    .onUploadComplete(async ({ file }) => ({
      name: file.name,
      url: file.ufsUrl,
    })),
  receiptUploader: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "4MB",
    },
    pdf: {
      maxFileCount: 1,
      maxFileSize: "8MB",
    },
  })
    .middleware(async () => ({ uploadedBy: "tenant" }))
    .onUploadComplete(async ({ file }) => ({
      name: file.name,
      url: file.ufsUrl,
    })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
