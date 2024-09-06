"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import ChatContainer from "@/components/ChatContainer";
import Footer from "@/components/Footer";

interface Message {
  username?: ReactNode;
  message: string;
  isCurrentUser?: boolean;
  time: string;
  isSystemMessage?: boolean;
}

export default function Chat({
  params,
}: {
  params: { roomId: string; username: string };
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const router = useRouter();
  const [usersInRoom, setUsersInRoom] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const username = searchParams.get("username") ?? "";
  const roomId = params.roomId;


  const killChat = () => {
    if (socket) {
      socket.emit("killChat", { roomId, username });
    }
  };




  useEffect(() => {
    const NEXT_PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!NEXT_PUBLIC_BACKEND_URL) {
      throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");
    }
    const newSocket = io(NEXT_PUBLIC_BACKEND_URL);
    setSocket(newSocket);

    newSocket.emit("joinRoom", { roomId, username });

    // Listen for regular chat messages
    newSocket.on(
      "message",
      (message: { username: ReactNode; message: string }) => {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            ...message,
            isCurrentUser: message.username === username,
            time: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }
    );

    const sendMessage = () => {
      if (inputMessage.trim() && socket) {
        if (inputMessage.toLowerCase() === "/kllchat") {
          killChat();
        } else {
          socket.emit("chatMessage", {
            roomId,
            username,
            message: inputMessage,
          });
        }
        setInputMessage("");
      }
    };

    // Listen for system messages
    newSocket.on("systemMessage", (message: string) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          message,
          isSystemMessage: true, // Mark the message as a system message
          time: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    });


       newSocket.on("chatKilled", () => {
         setMessages((prevMessages) => [
           ...prevMessages,
           {
             message:
               "This chat has been killed. You will be redirected shortly.",
             isSystemMessage: true,
             time: new Date().toLocaleTimeString("en-US", {
               hour: "2-digit",
               minute: "2-digit",
             }),
           },
         ]);
         setTimeout(() => {
           router.push("/");
         }, 5000); // Redirect after 5 seconds
       });

    // Listen for user list updates
    newSocket.on("roomData", ({ users }) => {
      setUsersInRoom(users); // Update the user list
    });

    return () => {
      newSocket.close();
    };
  }, [roomId, username]);

  const sendMessage = () => {
    if (inputMessage.trim() && socket) {
      socket.emit("chatMessage", { roomId, username, message: inputMessage });
      setInputMessage("");
    }
  };

  const leaveRoom = () => {
    if (socket) {
      socket.emit("leaveRoom", { roomId, username });
      router.push("/");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen py-20 lg:p-20">
      <Button
        variant="outline"
        onClick={killChat}
        className="text-primary mb-4"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </Button>
      <ChatContainer
        sendMessage={sendMessage}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        leaveRoom={leaveRoom}
        roomId={roomId}
        username={username}
        messages={messages}
        killChat={killChat}
        usersInRoom={usersInRoom}
      />
      <Footer />
    </div>
  );
}
