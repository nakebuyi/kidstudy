import { getPetEmoji } from "@/lib/pet-utils";

interface Pet {
  type: string;
  name: string;
  level: number;
  mood: string;
  hunger?: number;
}

interface PetDisplayProps {
  pet: Pet;
}

export function PetDisplay({ pet }: PetDisplayProps) {
  const emoji = getPetEmoji(pet);

  return (
    <div className="text-center">
      <div className="text-4xl mb-2">{emoji}</div>
      <div className="text-sm font-medium">{pet.name}</div>
      <div className="text-xs text-gray-500">Lv.{pet.level}</div>
    </div>
  );
}