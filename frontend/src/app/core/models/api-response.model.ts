export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  errors?: any[];
}

export interface PagedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
