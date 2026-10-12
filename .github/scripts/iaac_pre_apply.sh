#!/bin/sh
set -ex

# docker-cli: the ecr module's local-exec runs `docker pull/push` to seed a
# placeholder image. GitHub mounts /var/run/docker.sock into container jobs, so
# only the client binary is needed (the alpine/terragrunt image lacks it).
apk add aws-cli curl jq openssh-client-default git docker-cli nodejs npm --no-cache

# gsnake-modules (private Terraform modules) is hosted on GitHub; this SSH key
# lets Terragrunt clone it. The monorepo itself is checked out by actions/checkout.
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
echo "$SSH_PRIVATE_KEY" > "$HOME/.ssh/id_ed25519"
chmod 400 "$HOME/.ssh/id_ed25519"

# Force git (used by Terragrunt/go-getter to clone modules) to use this key with
# host-key checking disabled. Setting core.sshCommand globally is more reliable
# than ~/.ssh/config, which the go-getter git clone did not honor in the
# container. Absolute key path avoids ~ expansion issues.
git config --global core.sshCommand "ssh -i $HOME/.ssh/id_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

# Trust the checked-out repo so Terragrunt's get_repo_root()
# (git rev-parse --show-toplevel) works despite container checkout ownership.
git config --global --add safe.directory '*' || true

aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID --profile $G_AWS_PROFILE_SHARED
aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY --profile $G_AWS_PROFILE_SHARED
aws configure set region $AWS_DEFAULT_REGION --profile $G_AWS_PROFILE_SHARED

# Assume per-env role (one user, role per env); sets G_AWS_PROFILE with temp creds
sh .github/scripts/aws-assume-env-role.sh
