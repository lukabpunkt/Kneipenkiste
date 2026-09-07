/**
 * Animation states of the horse and the pose that carries them.
 *
 * The pose holds continuous values that ease towards whatever the current state asks for, so a
 * change of state never snaps: a horse that speeds up leans in over about 150 ms rather than
 * jumping (docs/04_DESIGN_SYSTEM.md §5.3).
 *
 * The gallop phase is *integrated*, never recomputed from the clock. Deriving it from t would
 * make the legs jump the moment the stride length changes, which audit A3 checks for explicitly.
 */

/** Stride duration in seconds at normal speed. Faster horses take shorter strides. */
const BASE_STRIDE = 0.55;

/** How quickly the pose eases towards the current state, per second. */
const BLEND_RATE = 9;

/** How long one full turn of the banana slip takes. */
const SPIN_SECONDS = 0.8;

/** Mane and tail segments, and the spring that gives them their follow-through. */
const HAIR_SEGMENTS = 4;
const HAIR_STIFFNESS = 90;
const HAIR_DAMPING = 13;

/**
 * What each animation state asks the body to do. Every value is eased towards, never set.
 *
 * cycle     stride speed multiplier, 0 stands still
 * bounce    vertical travel of the body, in units of the horse size
 * swing     how far the legs reach
 * lean      forward pitch of the whole body, in radians
 * headPitch head angle, positive is nose down
 * neck      neck extension, 1 is normal, higher reaches forward
 * tailLift  how high the tail is carried
 * rear      how far the horse is up on its hind legs
 * turn      0 faces forward, 1 has turned right around — used for the confused horse
 * spin      how much of the slip rotation is applied, so it fades in and out
 * lids      1 forces the eyes shut, for the sleeper
 */
const STATES = {
  idle: { cycle: 0, bounce: 0.012, swing: 0.1, lean: 0, headPitch: 0.05, neck: 1, tailLift: 0 },
  gallop: { cycle: 1, bounce: 0.075, swing: 1, lean: 0.05, headPitch: 0, neck: 1, tailLift: 0.5 },
  gallop_fast: {
    cycle: 1.22,
    bounce: 0.09,
    swing: 1.15,
    lean: 0.11,
    headPitch: -0.06,
    neck: 1.12,
    tailLift: 0.85,
  },
  trot_in: {
    cycle: 0.5,
    bounce: 0.035,
    swing: 0.45,
    lean: -0.02,
    headPitch: 0.22,
    neck: 0.92,
    tailLift: 0.1,
  },
  celebrate: {
    cycle: 0.35,
    bounce: 0.05,
    swing: 0.5,
    lean: -0.35,
    headPitch: -0.3,
    neck: 1.1,
    tailLift: 1,
    rear: 1,
  },

  // --- Event states (M5) ---------------------------------------------------

  /** The front end drops as the leg buckles; the nose goes down and forward. */
  stumble: {
    cycle: 0.35,
    bounce: 0.015,
    swing: 0.55,
    lean: 0.3,
    headPitch: 0.4,
    neck: 0.85,
    tailLift: 0.2,
  },
  /** Uneven and careful, favouring the sore leg. */
  limp: {
    cycle: 0.8,
    bounce: 0.045,
    swing: 0.72,
    lean: 0.02,
    headPitch: 0.16,
    neck: 0.94,
    tailLift: 0.25,
  },
  /** Standing still, head right down. */
  vomit: {
    cycle: 0,
    bounce: 0.008,
    swing: 0.04,
    lean: 0.06,
    headPitch: 0.8,
    neck: 0.78,
    tailLift: 0.15,
  },
  /** Standing still, tail up, thoroughly unbothered. */
  pee: {
    cycle: 0,
    bounce: 0.005,
    swing: 0.03,
    lean: 0,
    headPitch: 0.02,
    neck: 1,
    tailLift: 1,
  },
  /** Asleep on its feet: head down, eyes shut. */
  sleep: {
    cycle: 0,
    bounce: 0.006,
    swing: 0.02,
    lean: 0,
    headPitch: 0.55,
    neck: 0.72,
    tailLift: 0,
    lids: 1,
  },
  /** Bolts awake, head up, everything wide open. */
  wake: {
    cycle: 0.7,
    bounce: 0.055,
    swing: 0.8,
    lean: -0.18,
    headPitch: -0.38,
    neck: 1.16,
    tailLift: 1,
    rear: 0.18,
  },
  /** Every hiccup jolts the whole horse. */
  hiccup: {
    cycle: 1,
    bounce: 0.135,
    swing: 0.9,
    lean: 0.02,
    headPitch: -0.05,
    neck: 1,
    tailLift: 0.6,
  },
  /** Turned right around and heading the wrong way. */
  confused: {
    cycle: 0.55,
    bounce: 0.035,
    swing: 0.5,
    lean: -0.04,
    headPitch: 0.02,
    neck: 1,
    tailLift: 0.3,
    turn: 1,
  },
  /** Sliding on the banana, spinning as it goes. */
  slip: {
    cycle: 0.15,
    bounce: 0.02,
    swing: 0.2,
    lean: 0.14,
    headPitch: -0.22,
    neck: 1.05,
    tailLift: 1,
    spin: 1,
  },
  /** Stopped and posing for the camera. */
  pose: {
    cycle: 0,
    bounce: 0.008,
    swing: 0.04,
    lean: -0.12,
    headPitch: -0.28,
    neck: 1.16,
    tailLift: 0.8,
    rear: 0.12,
  },
  /** Head down in the grass, which is very good grass. */
  graze: {
    cycle: 0.12,
    bounce: 0.006,
    swing: 0.08,
    lean: 0.02,
    headPitch: 0.9,
    neck: 0.82,
    tailLift: 0.1,
  },
  /** Bounding, with real air under the hooves. */
  fly: {
    cycle: 0.85,
    bounce: 0.17,
    swing: 1.25,
    lean: 0.07,
    headPitch: -0.12,
    neck: 1.1,
    tailLift: 1,
  },
};

/** Every field a state may set. Anything a state leaves out falls back to zero. */
const FIELDS = [
  'cycle',
  'bounce',
  'swing',
  'lean',
  'headPitch',
  'neck',
  'tailLift',
  'rear',
  'turn',
  'spin',
  'lids',
];

/**
 * Creates the pose of one horse.
 * @param {number} desync 0..1, offsets the stride so six horses do not march in lockstep
 * @returns {object}
 */
export function createPose(desync = 0) {
  return {
    phase: desync,
    cycle: 0,
    bounce: 0.012,
    swing: 0.1,
    lean: 0,
    headPitch: 0.05,
    neck: 1,
    tailLift: 0,
    rear: 0,
    turn: 0,
    spin: 0,
    lids: 0,
    /** How far through the slip spin the horse is, in radians. */
    spinAngle: 0,
    /** True once the jockey has fallen off; the horse finishes the race on its own. */
    riderless: false,
    /** Angles of the mane and tail segments, plus their velocities, for the spring. */
    mane: new Float64Array(HAIR_SEGMENTS),
    maneVelocity: new Float64Array(HAIR_SEGMENTS),
    tail: new Float64Array(HAIR_SEGMENTS),
    tailVelocity: new Float64Array(HAIR_SEGMENTS),
    /** Blink: eye open 1, closed 0. */
    eye: 1,
    blinkIn: 2 + desync * 5,
    /** How hard the hair streams back, 0 hanging to about 1.2 flat out. */
    stream: 0,
    /** Set by the renderer each frame; the dust emitter reads it. */
    hoofStrike: false,
    state: 'idle',
  };
}

/**
 * Runs a spring chain: each segment follows the one in front of it, with a lag.
 * @param {Float64Array} angles
 * @param {Float64Array} velocities
 * @param {number} drive target angle of the first segment
 * @param {number} dt
 */
function springChain(angles, velocities, drive, dt) {
  for (let i = 0; i < angles.length; i += 1) {
    const target = i === 0 ? drive : angles[i - 1];
    const acceleration = (target - angles[i]) * HAIR_STIFFNESS - velocities[i] * HAIR_DAMPING;
    velocities[i] += acceleration * dt;
    angles[i] += velocities[i] * dt;
  }
}

/**
 * Advances a pose by one frame.
 * @param {object} pose
 * @param {number} dt seconds
 * @param {object} options
 * @param {string} options.anim animation state name
 * @param {number} options.speed speed factor, 1 is the base pace of the race
 */
export function updatePose(pose, dt, { anim, speed = 1 }) {
  const target = STATES[anim] ?? STATES.gallop;
  pose.state = anim;

  const blend = 1 - Math.exp(-BLEND_RATE * dt);
  for (const key of FIELDS) {
    pose[key] += ((target[key] ?? 0) - pose[key]) * blend;
  }

  // The slip keeps turning while it lasts; multiplying by `spin` fades the rotation back out
  // as the state blends away, so the horse never snaps back upright.
  if (target.spin) pose.spinAngle += (dt / SPIN_SECONDS) * Math.PI * 2;
  else if (pose.spin < 0.02) pose.spinAngle = 0;

  // The stride shortens as the horse speeds up, and the phase carries over continuously.
  const previous = pose.phase;
  if (pose.cycle > 0.001) {
    const stride = BASE_STRIDE / Math.max(0.35, speed * pose.cycle);
    pose.phase = (pose.phase + dt / stride) % 1;
  }
  // Two hoof strikes per stride, at the bottom of each bounce.
  pose.hoofStrike = Math.floor(previous * 2) !== Math.floor(pose.phase * 2);

  // How far back the hair is blown is a property of speed, and belongs to the direction the
  // renderer starts the chain from. The spring only carries the flick on top of it, so the
  // bends stay small and the chain cannot curl in on itself.
  pose.stream += (Math.min(1.2, speed * pose.cycle) - pose.stream) * blend;

  const wave = Math.sin(pose.phase * Math.PI * 2);
  springChain(pose.mane, pose.maneVelocity, wave * 0.14, dt);
  springChain(pose.tail, pose.tailVelocity, wave * 0.1 - pose.tailLift * 0.12, dt);

  pose.blinkIn -= dt;
  if (pose.blinkIn <= 0) {
    pose.eye = 0;
    pose.blinkIn = 3 + Math.random() * 4;
  } else if (pose.eye < 1) {
    pose.eye = Math.min(1, pose.eye + dt * 9);
  }
  // A sleeping horse keeps its eyes shut whatever the blink timer thinks.
  if (pose.lids > 0.5) pose.eye = 0;
}

/**
 * Joint angles of one leg at the current phase.
 *
 * A simplified four-beat gallop: the hind legs push off first, the front legs reach, and there
 * is a moment of suspension when all four are off the ground.
 *
 * @param {number} phase 0..1
 * @param {number} offset where in the stride this leg sits
 * @param {number} swing how far it reaches
 * @param {boolean} front front legs fold differently from hind legs
 * @returns {{thigh: number, shank: number}} radians, 0 is straight down, positive is forward
 */
export function legAngles(phase, offset, swing, front) {
  const a = ((phase + offset) % 1) * Math.PI * 2;
  const reach = front ? 0.62 : 0.7;
  const thigh = Math.sin(a) * reach * swing;
  // The joint folds hardest while the leg swings forward, and straightens to push.
  const fold = Math.max(0, Math.sin(a - (front ? 1.15 : 0.75))) * (front ? 1.25 : 1.05) * swing;
  return { thigh, shank: thigh - fold };
}

/** How high the body rides at the current phase, in units of the horse size. */
export function bodyLift(pose) {
  const a = pose.phase * Math.PI * 2;
  // A gallop is not a sine: the suspension phase lifts higher than the beats push down.
  const bounce = Math.abs(Math.sin(a));
  const suspension = Math.max(0, Math.sin(a * 2 - 1.2)) * 0.45;
  return (bounce + suspension) * pose.bounce;
}

/** Every state the renderer knows, for the horse lab. */
export const ANIMATION_STATES = Object.keys(STATES);
