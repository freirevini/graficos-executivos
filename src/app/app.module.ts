import { registerLocaleData } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID, NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthPlaceholderInterceptor } from './core/interceptors/auth-placeholder.interceptor';

registerLocaleData(localePt, 'pt-BR');

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    // PONTO DE INTEGRAÇÃO: remover este interceptor ao portar — o JWT do SSO
    // Atlante é anexado pelo interceptor do chassi (@arqt/ng15-framework).
    { provide: HTTP_INTERCEPTORS, useClass: AuthPlaceholderInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
