{{/*
Expand the name of the chart.
*/}}
{{- define "szerencsejatek-telegram-bot.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "szerencsejatek-telegram-bot.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Database URL for SQLite volume at /data
*/}}
{{- define "szerencsejatek-telegram-bot.databaseUrl" -}}
{{- if .Values.config.databaseUrl }}
{{- .Values.config.databaseUrl }}
{{- else }}
{{- "file:/data/app.db" }}
{{- end }}
{{- end }}

{{/*
Image pull policy for workload containers
*/}}
{{- define "szerencsejatek-telegram-bot.imagePullPolicy" -}}
{{- if .Values.knative.imagePullPolicy }}
{{- .Values.knative.imagePullPolicy }}
{{- else }}
{{- .Values.image.pullPolicy }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "szerencsejatek-telegram-bot.labels" -}}
helm.sh/chart: {{ include "szerencsejatek-telegram-bot.chart" . }}
{{ include "szerencsejatek-telegram-bot.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "szerencsejatek-telegram-bot.selectorLabels" -}}
app.kubernetes.io/name: {{ include "szerencsejatek-telegram-bot.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "szerencsejatek-telegram-bot.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Container env vars (server.ts / loadConfig)
*/}}
{{- define "szerencsejatek-telegram-bot.env" -}}
- name: PORT
  value: {{ .Values.service.port | quote }}
- name: DATABASE_URL
  value: {{ include "szerencsejatek-telegram-bot.databaseUrl" . | quote }}
- name: GAME_ID
  value: {{ .Values.config.gameId | quote }}
- name: DEFAULT_LOCALE
  value: {{ .Values.config.defaultLocale | quote }}
- name: TELEGRAM_WEBHOOK_PATH
  value: {{ .Values.config.telegramWebhookPath | quote }}
- name: LOG_FORMAT
  value: {{ .Values.config.logFormat | quote }}
- name: LOG_LEVEL
  value: {{ .Values.config.logLevel | quote }}
- name: OTEL_SERVICE_NAME
  value: {{ .Values.config.otel.serviceName | quote }}
- name: OTEL_SERVICE_VERSION
  value: {{ .Values.config.otel.serviceVersion | quote }}
{{- if .Values.config.webhookUrl }}
- name: WEBHOOK_URL
  value: {{ .Values.config.webhookUrl | quote }}
{{- end }}
{{- if .Values.config.otoslottoResultJsonUrl }}
- name: OTOSLOTTO_RESULT_JSON_URL
  value: {{ .Values.config.otoslottoResultJsonUrl | quote }}
{{- end }}
{{- if .Values.config.eurojackpotResultJsonUrl }}
- name: EUROJACKPOT_RESULT_JSON_URL
  value: {{ .Values.config.eurojackpotResultJsonUrl | quote }}
{{- end }}
{{- if .Values.config.otel.exporterOtlpEndpoint }}
- name: OTEL_EXPORTER_OTLP_ENDPOINT
  value: {{ .Values.config.otel.exporterOtlpEndpoint | quote }}
{{- end }}
{{- if .Values.telegram.existingSecret }}
- name: BOT_TOKEN
  valueFrom:
    secretKeyRef:
      name: {{ .Values.telegram.existingSecret | quote }}
      key: {{ .Values.telegram.existingSecretKey | quote }}
{{- else if .Values.telegram.botToken }}
- name: BOT_TOKEN
  valueFrom:
    secretKeyRef:
      name: {{ include "szerencsejatek-telegram-bot.fullname" . }}-telegram
      key: token
{{- end }}
{{- if .Values.telegramWebhook.existingSecret }}
- name: TELEGRAM_WEBHOOK_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ .Values.telegramWebhook.existingSecret | quote }}
      key: {{ .Values.telegramWebhook.existingSecretKey | quote }}
{{- end }}
{{- end }}

{{/*
Volume mounts for /data
*/}}
{{- define "szerencsejatek-telegram-bot.volumeMounts" -}}
- name: data
  mountPath: /data
{{- end }}

{{/*
Volumes: emptyDir, PVC, or none if deployment without persistence
*/}}
{{- define "szerencsejatek-telegram-bot.volumes" -}}
- name: data
{{- if .Values.persistence.enabled }}
  persistentVolumeClaim:
    claimName: {{ include "szerencsejatek-telegram-bot.fullname" . }}-data
{{- else }}
  emptyDir: {}
{{- end }}
{{- end }}
