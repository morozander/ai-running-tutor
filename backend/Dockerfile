ARG BASE_IMAGE=public.ecr.aws/lambda/nodejs:22.2026.02.17.14-x86_64
# hadolint ignore=DL3006
FROM ${BASE_IMAGE}

# Optional: uncomment to add RDS CA for strict SSL verification (rejectUnauthorized: true)
# RUN mkdir -p /cert
# ADD --chmod=644 https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /cert/global-bundle.pem
# RUN chmod 755 /cert

COPY package.json pnpm-lock.yaml ${LAMBDA_TASK_ROOT}/

RUN corepack enable && corepack prepare pnpm@9 --activate && \
    pnpm install --frozen-lockfile --ignore-scripts

COPY . ${LAMBDA_TASK_ROOT}

RUN corepack enable && pnpm run build

CMD [ "dist/src/lambda.handler" ]
