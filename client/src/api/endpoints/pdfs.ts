import { http } from "../http"
import type { Page, Pdf, PdfDetail, PdfStatus } from "../types"
import { uploadFile, type UploadOptions } from "../upload"

export const pdfsApi = {
  list: (
    params: { limit?: number; offset?: number; status?: PdfStatus } = {}
  ) => http.get<Page<Pdf>>("/pdfs", { query: { limit: 100, ...params } }),
  get: (id: string) => http.get<PdfDetail>(`/pdfs/${id}`),
  delete: (id: string) => http.delete(`/pdfs/${id}`),
  upload: (file: File, options?: UploadOptions) => {
    const form = new FormData()
    form.append("file", file)
    return uploadFile<Pdf>("/pdfs", form, options)
  },
}
