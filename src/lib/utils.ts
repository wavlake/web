import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ADJECTIVES = [
  "Brave", "Clever", "Swift", "Gentle", "Fierce", "Mighty", "Nimble", "Quiet", "Lively", "Bold",
  "Curious", "Daring", "Eager", "Friendly", "Gallant", "Happy", "Jolly", "Kind", "Lucky", "Merry",
  "Noble", "Playful", "Quick", "Silly", "Witty", "Zany", "Charming", "Dazzling", "Energetic", "Fearless",
  "Graceful", "Humble", "Inventive", "Jovial", "Keen", "Loyal", "Mysterious", "Nifty", "Optimistic", "Patient",
  "Quirky", "Radiant", "Sincere", "Thoughtful", "Upbeat", "Vivid", "Wise", "Youthful", "Zealous", "Adventurous",
  "Bouncy", "Calm", "Dreamy", "Excited", "Funky", "Gleeful", "Heroic", "Imaginative", "Jazzy", "Kindhearted"
];

const ANIMALS = [
  "Lion", "Tiger", "Bear", "Wolf", "Fox", "Eagle", "Hawk", "Falcon", "Panther", "Leopard",
  "Jaguar", "Cheetah", "Otter", "Beaver", "Rabbit", "Hare", "Squirrel", "Deer", "Moose", "Elk",
  "Buffalo", "Bison", "Horse", "Zebra", "Giraffe", "Elephant", "Rhino", "Hippo", "Monkey", "Gorilla",
  "Chimpanzee", "Orangutan", "Koala", "Kangaroo", "Wallaby", "Wombat", "Sloth", "Armadillo", "Opossum", "Raccoon",
  "Badger", "Weasel", "Mink", "Ferret", "Skunk", "Porcupine", "Hedgehog", "Bat", "Mole", "Shrew",
  "Dog", "Cat", "Mouse", "Rat", "Hamster", "Gerbil", "GuineaPig", "Goat", "Sheep", "Pig",
  "Cow", "Bull", "Ox", "Camel", "Llama", "Alpaca", "Antelope", "Gazelle", "Reindeer", "Caribou",
  "Seal", "Walrus", "SeaLion", "Dolphin", "Whale", "Shark", "Octopus", "Squid", "Crab", "Lobster",
  "Shrimp", "Jellyfish", "Starfish", "Seahorse", "Penguin", "Puffin", "Albatross", "Pelican", "Swan", "Goose",
  "Duck", "Chicken", "Rooster", "Turkey", "Peacock", "Pigeon", "Dove", "Crow", "Raven", "Magpie"
];

export function generateFakeName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}
