import amqp from "amqplib";
import type { Channel, Connection } from "amqplib";
import { config } from "./config";

let channel: any;
let connection: any;

export const initRabbitMQ = async (retries = 5) :Promise<void> => {
 while(retries){
    try {
    connection = await amqp.connect(config.RABBITMQ_URL as string);
    channel = await connection.createChannel();
    
    await channel.assertQueue("chat_messages", { durable: true });
    
    console.log("Successfully connected to RabbitMQ");
    return
  } catch (error) {
    console.error(`RabbitMQ connection failed. Retries left: ${retries - 1}`);
    retries -= 1;
    if (retries === 0) break;
    await new Promise(res => setTimeout(res, 5000));
  }
 }
 throw new Error("Could not connect to RabbitMQ after multiple attempts");
};

export const getChannel = () => {
  if (!channel) throw new Error("RabbitMQ channel not initialized");
  return channel;
};