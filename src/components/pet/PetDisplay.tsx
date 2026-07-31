interface Pet {
  type: string;
  level: number;
  mood: string;
  hunger: number;
}

interface PetDisplayProps {
  pet: Pet;
}

export function PetDisplay({ pet }: PetDisplayProps) {
  return (
    <div className="text-center">
      <div className="text-4xl mb-2">🐱</div>
      <div className="text-sm font-medium">{pet.type}</div>
      <div className="text-xs text-gray-500">Lv.{pet.level}</div>
    </div>
  );
}