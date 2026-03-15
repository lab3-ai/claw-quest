export interface ApiResponse<T> {
  data?: T
  error?: {
    message: string
    code?: string
  }
}
