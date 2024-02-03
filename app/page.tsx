"use client";
import { ModeToggle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { beep } from "@/utils/audio";
import {
  Camera,
  FlipHorizontal,
  MoonIcon,
  PersonStanding,
  SunIcon,
  Video,
  Volume2,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Rings } from "react-loader-spinner";
import Webcam from "react-webcam";
import { toast } from "sonner";
import * as cocossd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";
import { drawOnCanvas } from "@/utils/draw";
import { DetectedObject } from "@tensorflow-models/coco-ssd";
import SocialMediaLinks from "@/components/social-links";

type Props = {};

let intervel: any = null;
let stopTimeout: any = null;
const HomePage = (props: Props) => {
  const webcanRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  //state var
  const [mirrored, setMirrored] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [autoRecord, setautoRecord] = useState<boolean>(false);
  const [Volume, setVolume] = useState(0.8);
  const [model, setmodel] = useState<cocossd.ObjectDetection>();
  const [loading, setloading] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  useEffect(() => {
    if (webcanRef && webcanRef.current) {
      const stream = (webcanRef.current.video as any).captureStream();
      if (stream) {
        mediaRecorderRef.current = new MediaRecorder(stream);

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            const recordedBlob = new Blob([e.data], { type: "video" });
            const videoUrl = URL.createObjectURL(recordedBlob);
            const a = document.createElement("a");
            a.href = videoUrl;
            a.download = `${formatDate(new Date())}.webm`;
            a.click();
          }
        };
        mediaRecorderRef.current.onstart = (e) => {
          setIsRecording(true);
        };
        mediaRecorderRef.current.onstop = (e) => {
          setIsRecording(false);
        };
      }
    }
  }, [webcanRef]);

  useEffect(() => {
    setloading(true);
    initModel();
  }, []);

  async function initModel() {
    const loadModel: cocossd.ObjectDetection = await cocossd.load({
      base: "mobilenet_v2",
    });
    setmodel(loadModel);
  }

  useEffect(() => {
    if (model) {
      setloading(false);
    }
  }, [model]);

  async function runPrediction() {
    if (
      model &&
      webcanRef.current &&
      webcanRef.current.video &&
      webcanRef.current.video.readyState === 4
    ) {
      const prediction: DetectedObject[] = await model.detect(
        webcanRef.current.video
      );
      resizeCanvas(canvasRef, webcanRef);
      drawOnCanvas(mirrored, prediction, canvasRef.current?.getContext("2d"));

      let isPerson: boolean = false;
      if (prediction.length > 0) {
        prediction.forEach((prediction) => {
          isPerson = prediction.class === "person";
        });
        if (isPerson && autoRecord) {
          startRecordign(true);
        }
      }
    }
  }
  useEffect(() => {
    intervel = setInterval(() => {
      runPrediction();
    }, 100);
    return () => clearInterval(intervel);
  }, [webcanRef.current, model, mirrored, autoRecord, runPrediction]);

  return (
    <div className="flex h-screen">
      {/* Left Division for webcam */}
      <div className="relative">
        <div className="relative h-screen w-full">
          <Webcam
            ref={webcanRef}
            mirrored={mirrored}
            className=" h-full w-full origin-contain p-2"
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 h-full w-full object-contain"
          ></canvas>
        </div>
      </div>
      {/* Right Division for button */}
      <div className="flex flex-row flex-1">
        <div className=" border-primary/5 border-2 max-w-xs flex flex-col gap-2 justify-between shadow-md rounded-md p-4">
          {/* Top Section */}
          <div className="flex flex-col gap-2">
            <ModeToggle />
            <Button
              variant={"outline"}
              size={"icon"}
              onClick={() => {
                setMirrored((prev) => !prev);
              }}
            >
              <FlipHorizontal />
            </Button>

            <Separator className="my-2" />
          </div>
          {/* Middle Section */}
          <div className="flex flex-col gap-2">
            <Separator className="my-2" />
            <Button
              variant={"outline"}
              size={"icon"}
              onClick={userPromptScreenshot}
            >
              <Camera />
            </Button>
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size={"icon"}
              onClick={userPromptRecord}
            >
              <Video />
            </Button>

            <Button
              variant={autoRecord ? "destructive" : "outline"}
              size={"icon"}
              onClick={toggleAutoRecord}
            >
              {autoRecord ? (
                <Rings
                  visible={true}
                  height={45}
                  color="white"
                  ariaLabel="rings-loading"
                  wrapperStyle={{}}
                  wrapperClass=""
                />
              ) : (
                <PersonStanding />
              )}
            </Button>
            <Separator className="my-2" />
          </div>
          {/* Bottom Section */}
          <div className="flex flex-col gap-2">
            <Separator className="my-2" />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} size={"icon"}>
                  <Volume2 />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Slider
                  defaultValue={[Volume]}
                  max={1}
                  min={0}
                  step={0.2}
                  onValueCommit={(val) => {
                    setVolume(val[0]);
                    //Notifications
                    beep(val[0]);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className=" h-full flex-1 py-4 px-2 overflow-y-scroll">
          <RenderFeatureHighlightsSection />
        </div>
      </div>
      {loading && (
        <div className=" z-50 absolute w-full h-full flex items-center justify-center bg-primary-foreground">
          Getting Things Ready ... <Rings height={50} color="red" />
        </div>
      )}
    </div>
  );

  //Functions
  function userPromptScreenshot() {
    if (!webcanRef.current) {
      toast("Camera not found, Please refresh");
    } else {
      const imgSrc = webcanRef.current.getScreenshot();
      const blob = base64toBlob(imgSrc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formatDate(new Date())}.png`;
      a.click();
    }
    //Take picture
    //Save to downloads
  }

  function userPromptRecord() {
    if (!webcanRef.current) {
      toast("Camera not found, Please refresh");
    }

    if (mediaRecorderRef.current?.state == "recording") {
      // Check if recording
      mediaRecorderRef.current.requestData();
      // Stop recording
      clearTimeout(stopTimeout);
      mediaRecorderRef.current.stop();
      // Save to downloads
      toast("Recording saved to doanloads");
    } else {
      // If not recording then start recording
      startRecordign(false);
    }
  }

  function startRecordign(doBeep: Boolean) {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current?.state !== "recording"
    ) {
      mediaRecorderRef.current?.start();
      doBeep && beep(Volume);
      stopTimeout = setTimeout(() => {
        if (mediaRecorderRef.current?.state == "recording") {
          mediaRecorderRef.current.requestData();
          mediaRecorderRef.current.stop();
        }
      }, 30000);
    }
  }

  function toggleAutoRecord() {
    if (autoRecord) {
      setautoRecord(false);
      // Notifications
      toast("Autorecord disabled.");
    } else {
      setautoRecord(true);
      // Notifications
      toast("Autorecord enabled.");
    }
  }

  // inner components
  function RenderFeatureHighlightsSection() {
    return (
      <div className="text-xs text-muted-foreground">
        <ul className="space-y-4">
          <li>
            <strong>Dark Mode/Sys Theme 🌗</strong>
            <p>Toggle between dark mode and system theme.</p>
            <Button className="my-2 h-6 w-6" variant={"outline"} size={"icon"}>
              <SunIcon size={14} />
            </Button>{" "}
            /{" "}
            <Button className="my-2 h-6 w-6" variant={"outline"} size={"icon"}>
              <MoonIcon size={14} />
            </Button>
          </li>
          <li>
            <strong>Horizontal Flip ↔️</strong>
            <p>Adjust horizontal orientation.</p>
            <Button
              className="h-6 w-6 my-2"
              variant={"outline"}
              size={"icon"}
              onClick={() => {
                setMirrored((prev) => !prev);
              }}
            >
              <FlipHorizontal size={14} />
            </Button>
          </li>
          <Separator />
          <li>
            <strong>Take Pictures 📸</strong>
            <p>Capture snapshots at any moment from the video feed.</p>
            <Button
              className="h-6 w-6 my-2"
              variant={"outline"}
              size={"icon"}
              onClick={userPromptScreenshot}
            >
              <Camera size={14} />
            </Button>
          </li>
          <li>
            <strong>Manual Video Recording 📽️</strong>
            <p>Manually record video clips as needed.</p>
            <Button
              className="h-6 w-6 my-2"
              variant={isRecording ? "destructive" : "outline"}
              size={"icon"}
              onClick={userPromptRecord}
            >
              <Video size={14} />
            </Button>
          </li>
          <Separator />
          <li>
            <strong>Enable/Disable Auto Record 🚫</strong>
            <p>
              Option to enable/disable automatic video recording whenever
              required.
            </p>
            <Button
              className="h-6 w-6 my-2"
              variant={autoRecord ? "destructive" : "outline"}
              size={"icon"}
              onClick={toggleAutoRecord}
            >
              {autoRecord ? (
                <Rings color="white" height={30} />
              ) : (
                <PersonStanding size={14} />
              )}
            </Button>
          </li>

          <li>
            <strong>Volume Slider 🔊</strong>
            <p>Adjust the volume level of the notifications.</p>
          </li>
          <li>
            <strong>Camera Feed Highlighting 🎨</strong>
            <p>
              Highlights persons in{" "}
              <span style={{ color: "#FF0F0F" }}>red</span> and other objects in{" "}
              <span style={{ color: "#00B612" }}>green</span>.
            </p>
          </li>
          <Separator />
          <li className="space-y-4">
            <strong>Share your thoughts 💬 </strong>
            <SocialMediaLinks />
            <br />
            <br />
            <br />
          </li>
        </ul>
      </div>
    );
  }
};

export default HomePage;
function resizeCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  webcanRef: React.RefObject<Webcam>
) {
  const canvas = canvasRef.current;
  const video = webcanRef.current?.video;

  if (canvas && video) {
    const { videoWidth, videoHeight } = video;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
  }
}

function formatDate(d: Date) {
  const formattedDate =
    [
      (d.getMonth() + 1).toString().padStart(2, "0"),
      d.getDate().toString().padStart(2, "0"),
      d.getFullYear(),
    ].join("-") +
    " " +
    [
      d.getHours().toString().padStart(2, "0"),
      d.getMinutes().toString().padStart(2, "0"),
      d.getSeconds().toString().padStart(2, "0"),
    ].join("-");
  return formattedDate;
}

function base64toBlob(base64Data: any) {
  const byteCharacters = atob(base64Data.split(",")[1]);
  const arrayBuffer = new ArrayBuffer(byteCharacters.length);
  const byteArray = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type: "image/png" }); // Specify the image type here
}
