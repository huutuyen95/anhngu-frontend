export type SettingType = "string" | "int" | "float" | "bool" | "json" | "file";

export type SettingValue = string | number | boolean | null;

export type SettingOption = { value: string; label: string };

export type SettingField = {
  key: string;
  label: string;
  hint: string;
  type: SettingType;
  value: SettingValue;
  default: SettingValue;
  required: boolean;
  readonly: boolean;
  secret: boolean;
  unit?: string;
  options?: SettingOption[];
  accept?: string;
};

export type SettingGroup = {
  key: string;
  label: string;
  desc: string;
  icon: string;
  fields: SettingField[];
};

export type SettingsResponse = {
  groups: SettingGroup[];
  meta: { last_saved_at: string | null; mail_verified: boolean };
};

export type SettingChange = {
  id: number;
  setting_key: string;
  label: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  created_at: string;
  revertible: boolean;
};

export type SettingChangesResponse = {
  data: SettingChange[];
  meta: { current_page: number; last_page: number; total: number };
};
