#!/bin/bash
hasura migrate apply --admin-secret "gx1dqNWxXAD129ZSJyOkpIPo4l7yS5RMPT3FEJ10sCy3Sd1YwlZ9M5ZWdZtdpw0x" --endpoint "https://company-885.hasura.app"
hasura metadata apply --admin-secret "gx1dqNWxXAD129ZSJyOkpIPo4l7yS5RMPT3FEJ10sCy3Sd1YwlZ9M5ZWdZtdpw0x" --endpoint "https://company-885.hasura.app"
