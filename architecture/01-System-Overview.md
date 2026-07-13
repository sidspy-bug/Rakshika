# System Overview

Rakshika is an AI-powered women safety and community emergency response ecosystem. The product combines a mobile-first experience, a modular backend, and an event-driven response network so the system can scale from an MVP to a production platform serving millions of users.

## Purpose

The platform is designed to reduce emergency response time by combining direct SOS escalation, nearby community responders, live location sharing, AI assistance, and automatic evidence collection.

## Primary Goals

- Trigger an emergency in as few steps as possible.
- Notify the right people and services immediately.
- Preserve evidence securely and automatically.
- Support hybrid online and offline emergency communication.
- Keep the architecture scalable, observable, and secure.

## High-Level Components

- Mobile app for end users and responders.
- API gateway as the single entry point for client traffic.
- FastAPI-based backend services for independent domain responsibilities.
- PostgreSQL for persistent relational data.
- Redis for caching and short-lived state.
- Supabase Storage for media and evidence files.
- Firebase Cloud Messaging for push notifications.
- Event-driven messaging for async emergency fan-out.

## Core Actors

- Woman or primary user triggering SOS.
- Community responder receiving nearby emergency alerts.
- Administrator monitoring platform activity and abuse.
- Backend services coordinating notifications, evidence, location, and AI.

## System Behavior

When an SOS is triggered, the emergency service creates a durable event and publishes it to the rest of the platform. Notification, community, location, evidence, and AI workflows react independently so the emergency path does not depend on a single synchronous chain.

## Design Principles

- Keep critical emergency flows fast and resilient.
- Separate business logic by domain.
- Prefer async processing for non-blocking tasks.
- Treat sensitive data as private by default.
- Design APIs and data models for long-term evolution.

## Scope

This document defines the overall platform direction. The remaining architecture files break the system into product requirements, roles, services, workflows, and implementation boundaries.
