#!/usr/bin/env bash
# Workload Identity Federation: que un rol IAM de AWS (el del backend del portal, una Lambda, una tarea ECS)
# pueda llamar a Agent Runtime SIN llaves JSON de service account.
# Correr una vez, con permisos de administrador IAM en el proyecto de Google Cloud.
set -euo pipefail
: "${GOOGLE_CLOUD_PROJECT:?}" "${AWS_ACCOUNT_ID:?}"
PROJECT_NUMBER=$(gcloud projects describe "$GOOGLE_CLOUD_PROJECT" --format='value(projectNumber)')
POOL=andes-aws
PROVIDER=aws-portal
AWS_ROLE=andes-portal-backend   # nombre del rol IAM que asume tu backend en AWS

gcloud services enable iam.googleapis.com sts.googleapis.com iamcredentials.googleapis.com cloudresourcemanager.googleapis.com --project "$GOOGLE_CLOUD_PROJECT"

# 1) Pool + proveedor AWS. attribute.aws_role = nombre del rol asumido (sale del ARN de STS).
gcloud iam workload-identity-pools create "$POOL" --project "$GOOGLE_CLOUD_PROJECT" --location=global --display-name="Cargas en AWS"
gcloud iam workload-identity-pools providers create-aws "$PROVIDER" --project "$GOOGLE_CLOUD_PROJECT" \
  --location=global --workload-identity-pool="$POOL" --account-id="$AWS_ACCOUNT_ID" \
  --attribute-mapping="google.subject=assertion.arn,attribute.aws_role=assertion.arn.extract('assumed-role/{role}/')"

# 2) Permiso para consultar el agente: roles/aiplatform.user al principal federado (acceso directo, sin impersonar).
#    Este rol lo recibe QUIEN LLAMA al agente; nunca el agente (él usa su Agent Identity).
gcloud projects add-iam-policy-binding "$GOOGLE_CLOUD_PROJECT" --role=roles/aiplatform.user \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.aws_role/${AWS_ROLE}"

# 3) Archivo de configuración (no contiene secretos). Cópialo al despliegue y apunta GOOGLE_APPLICATION_CREDENTIALS a él.
gcloud iam workload-identity-pools create-cred-config \
  "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}" \
  --aws --enable-imdsv2 --output-file=gcp-wif.json
echo "Listo: GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/gcp-wif.json"
