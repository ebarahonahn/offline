import { Pipe, PipeTransform } from '@angular/core';

const ROL_LABELS: Record<string, string> = {
  admin:              'Admin',
  supervisor:         'Supervisor',
  empleado:           'Empleado',
  jefe_departamento:  'Jefe Departamento',
};

@Pipe({ name: 'rol', standalone: true })
export class RolPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';
    return ROL_LABELS[value] ?? value;
  }
}
