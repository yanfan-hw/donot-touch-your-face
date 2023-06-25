import React, { useEffect, useRef, useState } from "react";
import "./App.scss";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import * as mobilnet from "@tensorflow-models/mobilenet";
import * as tf from "@tensorflow/tfjs";

import { Howl } from "howler";

import soundURL from "./assets/sound/no.mp3";
import cameraIcon from "./assets/camera.svg";

const soundWarning = new Howl({
  src: [soundURL],
});

const TRAINING_TICKS = 50;
const THRESHOLD = 0.9;

export default function Train() {
  const video = useRef();
  const classifier = useRef();
  const mobilenetModule = useRef();
  const last = useRef(false);
  const bar = useRef();
  const countdown = useRef();

  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [training, setTraining] = useState(false);
  const [ai, setAI] = useState(false);
  const [counting, setCountdown] = useState(false);
  const [trainingDone, setTrainingDone] = useState(false);
  const [touching, setUserTouching] = useState(false);

  const init = async function () {
    if (loaded) return;

    //* await active camera
    await setupWebcam();

    setAI(true);
    //* Create classifier
    classifier.current = knnClassifier.create();

    //* Load mobilenet
    mobilenetModule.current = await mobilnet.load();

    setLoaded(true);
  };

  const setupWebcam = async () => {
    return new Promise((resolve, reject) => {
      const navigatorAny = navigator;
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigatorAny.webkitGetUserMedia ||
        navigatorAny.mozGetUserMedia ||
        navigatorAny.msGetUserMedia;
      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          (stream) => {
            video.current.srcObject = stream;
            video.current.addEventListener(
              "loadeddata",
              () => {
                if (!loaded) {
                  resolve();
                }
              },
              false
            );
          },
          (error) => reject(error)
        );
      }
    });
  };

  const sleep = (milliseconds) => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  };

  const train = async (c) => {
    return new Promise(async (resolve) => {
      const activation = mobilenetModule.current.infer(
        video.current,
        classifier
      );
      classifier.current.addExample(activation, c);

      await tf.nextFrame();
      await sleep(100);
      resolve();
    });
  };

  const trainNotTouched = async () => {
    for (let i = 0; i < TRAINING_TICKS; i++) {
      await train(0);
      setBar(i);
    }
    setStep(1);
    setTraining(false);
  };

  const trainTouched = async () => {
    for (let i = 0; i < TRAINING_TICKS; i++) {
      await train(1);
      setBar(i);
    }
    setStep(2);
    setTraining(false);
  };

  const trainCountDown = async (n) => {
    setCountdown(true);
    bar.current.style.width = "0%";
    countdown.current.className = "countdown item-active-flex countdown3";
    await sleep(1000);

    countdown.current.className = "countdown item-active-flex countdown2";
    await sleep(1000);

    countdown.current.className = "countdown item-active-flex countdown1";
    await sleep(1000);
    setCountdown(false);
    setTraining(true);

    if (n === 0) {
      trainNotTouched();
    } else {
      trainTouched();
    }
  };

  const doDetection = async () => {
    if (classifier.current.getNumClasses() > 0) {
      const activation = mobilenetModule.current.infer(
        video.current,
        classifier
      );
      const result = await classifier.current.predictClass(activation);

      if (
        result.classIndex === 1 &&
        result.confidences[result.classIndex] > THRESHOLD
      ) {
        setTouching(true);
      } else {
        setTouching(false);
      }
    }

    setTimeout(() => doDetection());
  };

  const setTouching = (tf) => {
    if (tf) {
      setUserTouching(true);

      document.title = 'You touched your face!';

      if (tf !== last.current) {
        soundWarning.play();
      }
    } else {
      setUserTouching(false);
      document.title = 'Do Not Touch Your Face';
    }

    last.current = tf;
  };

  const setBar = (x) => {
    bar.current.style.width = parseInt((x / TRAINING_TICKS) * 100) + "%";
  };

  useEffect(() => {
    //* Init setup
    init();

    //* Clean up
    return () => {};
  }, []);

  return (
    <>
      <div className={touching ? 'all all-touching' : 'all'}>
        <div className="top">
          <div className="big-text">Do Not</div>
        </div>
        <div className="right">
          <div className="big-text">Touch</div>
        </div>
        <div className="bottom">
          <div className="big-text">Your</div>
        </div>
        <div className="left">
          <div className="big-text">Face</div>
        </div>
        <div className="container">
          <div className="center center-pad">
            <div>
              <div className="detector">
                <video
                  ref={video}
                  autoPlay
                  playsInline
                  width={640}
                  height={480}
                ></video>
                { touching ? <div className="detector-no">NO!</div> : null}
                <div
                  className={
                    trainingDone
                      ? "training-ui training-ui-hide"
                      : training
                      ? "training-ui training-ui-red"
                      : "training-ui"
                  }
                >
                  <div className="training-ui-left">
                    {!loaded && !ai ? "Waiting for webcam access..." : null}
                    {!loaded && ai ? "Activating face touching AI..." : null}

                    {step === 0 && loaded && !training ? (
                      <span>
                        1. Take a video <u>not touching</u> Your face.
                      </span>
                    ) : null}
                    {step === 0 && loaded && training ? (
                      <span>
                        Recording...<u> do not touch</u> your face
                      </span>
                    ) : null}
                    {step === 1 && loaded && !training ? (
                      <span>
                        2. Take a video <u>continuously touching</u> your
                        face(with clean hands)
                      </span>
                    ) : null}
                    {step === 1 && loaded && training ? (
                      <span>
                        Don't take your hands off your face until it's done!
                      </span>
                    ) : null}
                  </div>
                  <div className="training-ui-right">
                    {step === 0 && loaded && !training && !counting ? (
                      <button onClick={() => trainCountDown(0)}>
                        Take Video
                      </button>
                    ) : null}
                    {step === 1 && loaded && !training && !counting ? (
                      <button onClick={() => trainCountDown(1)}>
                        Take Video
                      </button>
                    ) : null}

                    <div className={training ? "bar item-active" : "bar"}>
                      <div ref={bar}></div>
                    </div>
                    <div
                      ref={countdown}
                      className={
                        counting ? "countdown item-active-flex" : "countdown"
                      }
                    >
                      <div>1</div>
                      <div>2</div>
                      <div>3</div>
                      <div>
                        <img src={cameraIcon} alt="Camera Icon" />
                      </div>
                    </div>
                  </div>

                  {step === 2 && loaded && !training && !counting ? (
                    <div className="training-ui-center">
                      <button
                        onClick={() => {
                          setTrainingDone(true);
                          doDetection();
                        }}
                      >
                        Ready!
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
