use futures_util::StreamExt;
use lapin::{
    options::*,
    types::FieldTable,
    Connection, ConnectionProperties, ExchangeKind,
};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{info, error, warn};

pub struct EventConsumer {
    connection: Option<Connection>,
    running: Arc<Mutex<bool>>,
}

impl EventConsumer {
    pub fn new() -> Self {
        Self {
            connection: None,
            running: Arc::new(Mutex::new(false)),
        }
    }

    pub async fn start(&mut self, amqp_url: &str) -> Result<(), lapin::Error> {
        let conn = Connection::connect(amqp_url, ConnectionProperties::default()).await?;
        let channel = conn.create_channel().await?;

        channel
            .exchange_declare(
                "petpay.domain.events",
                ExchangeKind::Topic,
                ExchangeDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                FieldTable::default(),
            )
            .await?;

        let queue = channel
            .queue_declare(
                "payments-event-queue",
                QueueDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                FieldTable::default(),
            )
            .await?;

        let routing_keys = vec![
            "booking.created",
            "booking.confirmed",
            "booking.cancelled",
        ];
        for key in &routing_keys {
            channel
                .queue_bind(
                    queue.name().as_str(),
                    "petpay.domain.events",
                    key,
                    QueueBindOptions::default(),
                    FieldTable::default(),
                )
                .await?;
        }

        info!(
            "Payments event consumer listening on {}",
            queue.name().as_str()
        );

        *self.running.lock().await = true;

        let mut consumer = channel
            .basic_consume(
                queue.name().as_str(),
                "payments-consumer",
                BasicConsumeOptions::default(),
                FieldTable::default(),
            )
            .await?;

        let _running = self.running.clone();

        tokio::spawn(async move {
            info!("RabbitMQ consumer started for payments service");
            while let Some(delivery) = consumer.next().await {
                match delivery {
                    Ok(delivery) => {
                        let routing_key = delivery.routing_key.clone();
                        match serde_json::from_slice::<Value>(&delivery.data) {
                            Ok(payload) => {
                                info!("Received event [{}]: {:?}", routing_key, payload);
                                if let Err(e) = handle_event(routing_key.as_str(), &payload).await {
                                    error!("Failed to handle event {}: {}", routing_key, e);
                                }
                            }
                            Err(e) => {
                                error!("Failed to parse event payload: {}", e);
                            }
                        }
                        delivery.ack(BasicAckOptions::default()).await.ok();
                    }
                    Err(e) => {
                        error!("Consumer error: {}", e);
                        break;
                    }
                }
            }
            info!("RabbitMQ consumer stopped");
        });

        Ok(())
    }

    pub async fn stop(&self) {
        *self.running.lock().await = false;
    }
}

async fn handle_event(
    routing_key: &str,
    _payload: &Value,
) -> Result<(), Box<dyn std::error::Error>> {
    match routing_key {
        "booking.created" => {
            info!("Processing booking.created event: creating pending payment");
            Ok(())
        }
        "booking.confirmed" => {
            info!("Processing booking.confirmed event");
            Ok(())
        }
        "booking.cancelled" => {
            info!("Processing booking.cancelled event");
            Ok(())
        }
        _ => {
            warn!("Unknown routing key: {}", routing_key);
            Ok(())
        }
    }
}
