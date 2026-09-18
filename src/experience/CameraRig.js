import * as THREE from "three";
import { range } from "./animation.js";
import { getViewportProfile } from "./responsive.js";

export function createCameraRig({ centered = false } = {}) {
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
  const target = new THREE.Vector3();
  let currentProfile = "";

  function update(progress, width, height) {
    const profile = getViewportProfile(width, height);
    const headstockInspect = range(progress, 0.08, 0.2);
    const chuckInspect = range(progress, 0.18, 0.34);
    const carriageInspect = range(progress, 0.36, 0.62);
    const tailstockInspect = range(progress, 0.62, 0.8);
    const overview = range(progress, 0.62, 0.9);
    const exploded = range(progress, 0.82, 0.96);
    const final = range(progress, 0.94, 1);

    camera.aspect = profile.aspect;
    camera.clearViewOffset();

    if (centered) {
      if (profile.mobileNarrow || profile.mobilePortrait) {
        camera.fov = 35.5;
        camera.position.set(11.2, 3.0, 7.2);
        target.set(0.75, 0.02, 0);
        camera.setViewOffset(width, height, 0, -height * 0.04, width, height);
      } else if (profile.tabletPortrait) {
        camera.fov = 35;
        camera.position.set(8.5, 3.0, 9.2);
        target.set(0.35, -0.02, 0);
      } else {
        camera.fov = 35;
        camera.position.set(5.9, 3.05, Math.max(12.2, 8.8 / profile.aspect));
        target.set(0.05, -0.04, 0);
      }
    } else if (profile.mobileNarrow || profile.mobilePortrait) {
      // A long lathe cannot be framed on a 9:19 screen by simply zooming out.
      // Looking farther down the machine axis keeps it large while preserving
      // chuck, carriage and tailstock in the same story.
      const narrow = profile.mobileNarrow ? 1 : 0;
      camera.fov = 34.2 + narrow * 0.8 + exploded * 2.4;
      camera.position.set(
        12.25 + narrow * 0.55 - carriageInspect * 0.62 - exploded * 0.12,
        3.0 + exploded * 0.36,
        6.15 + carriageInspect * 0.62 + overview * 0.82 + exploded * 5.75,
      );
      target.set(
        1.15 - headstockInspect * 0.3 - carriageInspect * 0.34 + tailstockInspect * 0.2 - exploded * 0.18,
        0.08 + exploded * 0.05,
        0,
      );
      camera.setViewOffset(
        width,
        height,
        0,
        height * (-0.145 + range(progress, 0.22, 0.5) * 0.145),
        width,
        height,
      );
    } else if (profile.tabletPortrait) {
      camera.fov = 34 + exploded * 2.1;
      camera.position.set(
        9.25 - carriageInspect * 0.5 - exploded * 0.18,
        2.9 + exploded * 0.42,
        7.65 + overview * 0.9 + exploded * 4.8,
      );
      target.set(
        0.8 - headstockInspect * 0.35 + carriageInspect * 0.18 + tailstockInspect * 0.3 - exploded * 0.25,
        0.06 + exploded * 0.06,
        0,
      );
      camera.setViewOffset(width, height, 0, -height * 0.055, width, height);
    } else if (profile.mobileLandscape) {
      // Short landscape screens need vertical headroom more than width. Keep the
      // 3/4 presentation, open the camera slightly and bias the subject upward.
      camera.fov = 36.5 + exploded * 1.7;
      camera.position.set(
        5.4 - headstockInspect * 0.2 - carriageInspect * 0.32 - exploded * 0.25,
        2.55 + exploded * 0.44,
        10.8 - chuckInspect * 0.15 + overview * 1.0 + exploded * 2.5,
      );
      target.set(
        0.35 - headstockInspect * 0.35 + carriageInspect * 0.45 + tailstockInspect * 0.38 - exploded * 0.36,
        0.02 + exploded * 0.08,
        0,
      );
      camera.setViewOffset(width, height, -width * 0.015, -height * 0.035, width, height);
    } else {
      camera.fov = (profile.desktopWide ? 33.2 : 33.8) + exploded * 1.55;
      camera.position.set(
        4.7 - headstockInspect * 0.22 - carriageInspect * 0.38 + tailstockInspect * 0.14 - exploded * 0.38,
        2.7 - chuckInspect * 0.06 + exploded * 0.52,
        9.55 - headstockInspect * 0.32 - chuckInspect * 0.24 + carriageInspect * 0.24 + overview * 1.08 + exploded * 2.6 + final * 0.42,
      );
      target.set(
        0.42 - headstockInspect * 0.42 + carriageInspect * 0.62 + tailstockInspect * 0.5 - exploded * 0.46,
        0.06 + exploded * 0.08,
        0,
      );
      camera.setViewOffset(
        width,
        height,
        -width * (profile.desktopWide ? 0.036 : 0.026) * (1 - range(progress, 0.48, 0.82)),
        -height * 0.006,
        width,
        height,
      );
    }

    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    currentProfile = profile.name;
    return profile;
  }

  return {
    camera,
    update,
    get profile() {
      return currentProfile;
    },
  };
}
