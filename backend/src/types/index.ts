export interface IApiResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  timestamp?: string;
}

export interface IApiErrorResponse {
  success: false;
  message: string;
  errors: unknown[];
  timestamp?: string;
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface IPaginatedData<T> {
  items: T[];
  pagination: IPaginationMeta;
}
