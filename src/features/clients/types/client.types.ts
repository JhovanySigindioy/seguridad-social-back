export interface Client {
  id: number;
  document_type_id: number;
  document_type_name?: string;
  first_name: string;
  second_name?: string | undefined;
  first_lastname: string;
  second_lastname?: string | undefined;
  full_name?: string;
  identification: string;
  email: string | null;
  phone_1?: string | undefined;
  phone_2?: string | undefined;
  office_id: number;
  office_name?: string;
  created_at: string;
}

export interface CreateClientDTO {
  document_type_id: number;
  first_name: string;
  second_name?: string | undefined;
  first_lastname: string;
  second_lastname?: string | undefined;
  identification: string;
  email?: string | undefined;
  phone_1?: string | undefined;
  phone_2?: string | undefined;
  office_id: number;
}

export interface UpdateClientDTO {
  document_type_id: number;
  first_name: string;
  second_name?: string | undefined;
  first_lastname: string;
  second_lastname?: string | undefined;
  identification: string;
  email?: string | undefined;
  phone_1?: string | undefined;
  phone_2?: string | undefined;
}
