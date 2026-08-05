export interface PetState {
  type: "cat" | "dog" | "rabbit";
  name: string;
  level: number;
  mood: "happy" | "normal" | "sad";
}
