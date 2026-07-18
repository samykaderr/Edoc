
export class FieldRegistry {
  public getInputType(fieldKey: string, fieldType: string, format?: string): string {
    if (format === 'date' || fieldKey.toLowerCase().includes('date')) return 'date';
    if (format === 'email' || fieldKey.toLowerCase().includes('email')) return 'email';
    if (fieldType === 'integer' || fieldType === 'number') return 'number';
    if (fieldType === 'boolean') return 'checkbox';
    return 'text';
  }
}