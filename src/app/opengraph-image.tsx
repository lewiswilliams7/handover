import {
  createHandoverOgImage,
  ogImageAlt,
  ogImageContentType,
  ogImageSize,
} from "@/lib/handover-og-image";

export const alt = ogImageAlt;
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image() {
  return createHandoverOgImage();
}
