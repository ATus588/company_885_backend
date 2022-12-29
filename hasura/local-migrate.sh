#!/bin/bash
hasura migrate apply --admin-secret "company885" --endpoint "http://localhost:8100"
hasura metadata apply --admin-secret "company885" --endpoint "http://localhost:8100"
