import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const message = err.error?.message || err.message || 'Error de comunicación con el servidor';
      console.error(`[HTTP ${err.status}] ${req.url}: ${message}`);
      return throwError(() => ({ ...err, userMessage: message }));
    })
  );
};
