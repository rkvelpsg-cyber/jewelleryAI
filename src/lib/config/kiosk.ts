export interface KioskCalibration {
  screenWidth: number;
  screenHeight: number;
  cameraOffsetX: number;
  cameraOffsetY: number;
  mirrorCamera: boolean;
  expectedCustomerDistanceMin: number;
  expectedCustomerDistanceMax: number;
  objectFitMode: "cover";
  handTrackingRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const kioskCalibration: KioskCalibration = {
  screenWidth: Number(process.env.NEXT_PUBLIC_KIOSK_SCREEN_WIDTH ?? 1080),
  screenHeight: Number(process.env.NEXT_PUBLIC_KIOSK_SCREEN_HEIGHT ?? 1920),
  cameraOffsetX: Number(process.env.NEXT_PUBLIC_CAMERA_OFFSET_X ?? 0),
  cameraOffsetY: Number(process.env.NEXT_PUBLIC_CAMERA_OFFSET_Y ?? 0),
  mirrorCamera: process.env.NEXT_PUBLIC_MIRROR_CAMERA !== "false",
  expectedCustomerDistanceMin: 0.8,
  expectedCustomerDistanceMax: 1.5,
  objectFitMode: "cover",
  handTrackingRegion: {
    x: 0.2,
    y: 0.25,
    width: 0.6,
    height: 0.5,
  },
};
