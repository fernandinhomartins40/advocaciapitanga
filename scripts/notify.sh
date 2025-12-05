#!/bin/bash

# Script de Notificações
# Envia alertas em caso de falha no deploy ou backup

set -e

# Configurações
NOTIFICATION_TITLE="${1:-Notificação Advocacia Pitanga}"
NOTIFICATION_MESSAGE="${2:-Evento no sistema}"
NOTIFICATION_LEVEL="${3:-info}"  # info, warning, error, success

# Cores para console
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Emoji baseado no nível
case $NOTIFICATION_LEVEL in
    error)
        EMOJI="🔴"
        COLOR=$RED
        ;;
    warning)
        EMOJI="⚠️"
        COLOR=$YELLOW
        ;;
    success)
        EMOJI="✅"
        COLOR=$GREEN
        ;;
    *)
        EMOJI="ℹ️"
        COLOR=$BLUE
        ;;
esac

# Log no console
echo -e "${COLOR}${EMOJI} ${NOTIFICATION_TITLE}${NC}"
echo -e "${COLOR}   ${NOTIFICATION_MESSAGE}${NC}"
echo ""

# Contadores
SUCCESS_COUNT=0
FAIL_COUNT=0

# ========================================
# OPÇÃO 1: Slack Webhook
# ========================================
if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    echo "📱 Enviando notificação para Slack..."

    # Cor do Slack baseada no nível
    case $NOTIFICATION_LEVEL in
        error)
            SLACK_COLOR="danger"
            ;;
        warning)
            SLACK_COLOR="warning"
            ;;
        success)
            SLACK_COLOR="good"
            ;;
        *)
            SLACK_COLOR="#36a64f"
            ;;
    esac

    # Payload JSON
    SLACK_PAYLOAD=$(cat <<EOF
{
    "attachments": [
        {
            "color": "${SLACK_COLOR}",
            "title": "${EMOJI} ${NOTIFICATION_TITLE}",
            "text": "${NOTIFICATION_MESSAGE}",
            "footer": "Advocacia Pitanga VPS",
            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
            "ts": $(date +%s)
        }
    ]
}
EOF
)

    if curl -X POST -H 'Content-type: application/json' \
        --data "$SLACK_PAYLOAD" \
        "$SLACK_WEBHOOK_URL" > /dev/null 2>&1; then
        echo "✅ Notificação enviada para Slack"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "❌ ERRO ao enviar para Slack"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
else
    echo "⏭️  Slack não configurado (defina SLACK_WEBHOOK_URL)"
    echo ""
fi

# ========================================
# OPÇÃO 2: Discord Webhook
# ========================================
if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
    echo "💬 Enviando notificação para Discord..."

    # Cor do Discord (decimal)
    case $NOTIFICATION_LEVEL in
        error)
            DISCORD_COLOR=15158332  # Vermelho
            ;;
        warning)
            DISCORD_COLOR=16776960  # Amarelo
            ;;
        success)
            DISCORD_COLOR=3066993   # Verde
            ;;
        *)
            DISCORD_COLOR=3447003   # Azul
            ;;
    esac

    # Payload JSON
    DISCORD_PAYLOAD=$(cat <<EOF
{
    "embeds": [
        {
            "title": "${EMOJI} ${NOTIFICATION_TITLE}",
            "description": "${NOTIFICATION_MESSAGE}",
            "color": ${DISCORD_COLOR},
            "footer": {
                "text": "Advocacia Pitanga VPS"
            },
            "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
        }
    ]
}
EOF
)

    if curl -X POST -H 'Content-type: application/json' \
        --data "$DISCORD_PAYLOAD" \
        "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1; then
        echo "✅ Notificação enviada para Discord"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "❌ ERRO ao enviar para Discord"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
else
    echo "⏭️  Discord não configurado (defina DISCORD_WEBHOOK_URL)"
    echo ""
fi

# ========================================
# OPÇÃO 3: Telegram Bot
# ========================================
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    echo "✈️  Enviando notificação para Telegram..."

    TELEGRAM_MESSAGE="${EMOJI} *${NOTIFICATION_TITLE}*%0A%0A${NOTIFICATION_MESSAGE}%0A%0A_Advocacia Pitanga VPS_"

    if curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${TELEGRAM_MESSAGE}" \
        -d "parse_mode=Markdown" > /dev/null 2>&1; then
        echo "✅ Notificação enviada para Telegram"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "❌ ERRO ao enviar para Telegram"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
else
    echo "⏭️  Telegram não configurado (defina TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)"
    echo ""
fi

# ========================================
# OPÇÃO 4: Email via SMTP
# ========================================
if [ -n "${SMTP_SERVER:-}" ] && [ -n "${SMTP_FROM:-}" ] && [ -n "${SMTP_TO:-}" ]; then
    echo "📧 Enviando notificação por email..."

    # Instalar mailutils se necessário
    if ! command -v mail &> /dev/null; then
        echo "Instalando mailutils..."
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -qq && apt-get install -y mailutils
    fi

    # Corpo do email
    EMAIL_BODY=$(cat <<EOF
${NOTIFICATION_TITLE}

${NOTIFICATION_MESSAGE}

---
Advocacia Pitanga VPS
$(date)
EOF
)

    # Enviar email
    if echo "$EMAIL_BODY" | mail -s "${EMOJI} ${NOTIFICATION_TITLE}" \
        -a "From: ${SMTP_FROM}" \
        -S smtp="${SMTP_SERVER}" \
        -S smtp-auth=login \
        -S smtp-auth-user="${SMTP_USER:-}" \
        -S smtp-auth-password="${SMTP_PASSWORD:-}" \
        "${SMTP_TO}"; then
        echo "✅ Notificação enviada por email para ${SMTP_TO}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "❌ ERRO ao enviar email"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
else
    echo "⏭️  Email não configurado (defina SMTP_SERVER, SMTP_FROM, SMTP_TO)"
    echo ""
fi

# ========================================
# OPÇÃO 5: Microsoft Teams Webhook
# ========================================
if [ -n "${TEAMS_WEBHOOK_URL:-}" ]; then
    echo "👥 Enviando notificação para Microsoft Teams..."

    # Cor do Teams
    case $NOTIFICATION_LEVEL in
        error)
            TEAMS_COLOR="FF0000"
            ;;
        warning)
            TEAMS_COLOR="FFA500"
            ;;
        success)
            TEAMS_COLOR="00FF00"
            ;;
        *)
            TEAMS_COLOR="0078D4"
            ;;
    esac

    # Payload JSON
    TEAMS_PAYLOAD=$(cat <<EOF
{
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    "summary": "${NOTIFICATION_TITLE}",
    "themeColor": "${TEAMS_COLOR}",
    "title": "${EMOJI} ${NOTIFICATION_TITLE}",
    "text": "${NOTIFICATION_MESSAGE}",
    "sections": [
        {
            "activityTitle": "Advocacia Pitanga VPS",
            "activitySubtitle": "$(date)"
        }
    ]
}
EOF
)

    if curl -X POST -H 'Content-Type: application/json' \
        --data "$TEAMS_PAYLOAD" \
        "$TEAMS_WEBHOOK_URL" > /dev/null 2>&1; then
        echo "✅ Notificação enviada para Microsoft Teams"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "❌ ERRO ao enviar para Microsoft Teams"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
else
    echo "⏭️  Microsoft Teams não configurado (defina TEAMS_WEBHOOK_URL)"
    echo ""
fi

# ========================================
# OPÇÃO 6: PagerDuty (para alertas críticos)
# ========================================
if [ -n "${PAGERDUTY_INTEGRATION_KEY:-}" ] && [ "$NOTIFICATION_LEVEL" = "error" ]; then
    echo "🚨 Criando incidente no PagerDuty..."

    # Severity baseada no nível
    PAGERDUTY_SEVERITY="error"

    # Payload JSON
    PAGERDUTY_PAYLOAD=$(cat <<EOF
{
    "routing_key": "${PAGERDUTY_INTEGRATION_KEY}",
    "event_action": "trigger",
    "payload": {
        "summary": "${NOTIFICATION_TITLE}",
        "source": "Advocacia Pitanga VPS",
        "severity": "${PAGERDUTY_SEVERITY}",
        "custom_details": {
            "message": "${NOTIFICATION_MESSAGE}",
            "timestamp": "$(date)"
        }
    }
}
EOF
)

    if curl -X POST -H 'Content-Type: application/json' \
        --data "$PAGERDUTY_PAYLOAD" \
        "https://events.pagerduty.com/v2/enqueue" > /dev/null 2>&1; then
        echo "✅ Incidente criado no PagerDuty"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "❌ ERRO ao criar incidente no PagerDuty"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
elif [ -n "${PAGERDUTY_INTEGRATION_KEY:-}" ]; then
    echo "⏭️  PagerDuty apenas para erros críticos"
    echo ""
else
    echo "⏭️  PagerDuty não configurado (defina PAGERDUTY_INTEGRATION_KEY)"
    echo ""
fi

# ========================================
# RESUMO
# ========================================
echo "========================================"
echo "📊 Resumo das Notificações"
echo "========================================"
echo "✅ Canais notificados: $SUCCESS_COUNT"
echo "❌ Falhas: $FAIL_COUNT"
echo ""

if [ $SUCCESS_COUNT -eq 0 ]; then
    echo "⚠️  AVISO: Nenhum canal de notificação configurado!"
    echo ""
    echo "Para configurar notificações, defina as variáveis de ambiente:"
    echo ""
    echo "Slack:"
    echo "  export SLACK_WEBHOOK_URL='https://hooks.slack.com/services/YOUR/WEBHOOK/URL'"
    echo ""
    echo "Discord:"
    echo "  export DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/YOUR/WEBHOOK'"
    echo ""
    echo "Telegram:"
    echo "  export TELEGRAM_BOT_TOKEN='your-bot-token'"
    echo "  export TELEGRAM_CHAT_ID='your-chat-id'"
    echo ""
    echo "Email:"
    echo "  export SMTP_SERVER='smtp.gmail.com:587'"
    echo "  export SMTP_FROM='noreply@advocaciapitanga.com.br'"
    echo "  export SMTP_TO='admin@advocaciapitanga.com.br'"
    echo "  export SMTP_USER='your-email@gmail.com'"
    echo "  export SMTP_PASSWORD='your-app-password'"
    echo ""
    echo "Microsoft Teams:"
    echo "  export TEAMS_WEBHOOK_URL='https://outlook.office.com/webhook/YOUR/WEBHOOK/URL'"
    echo ""
    echo "PagerDuty (apenas erros críticos):"
    echo "  export PAGERDUTY_INTEGRATION_KEY='your-integration-key'"
    echo ""
else
    echo "✅ Notificação enviada com sucesso para $SUCCESS_COUNT canal(is)!"
fi

exit 0
