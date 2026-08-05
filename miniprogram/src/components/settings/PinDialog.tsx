import { useState } from "react";
import { View, Text, Input } from "@tarojs/components";
import "./PinDialog.scss";

interface PinDialogProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_PIN = "1234";

export function PinDialog({ visible, onClose, onSuccess }: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  if (!visible) return null;

  const handleSubmit = () => {
    if (pin.length !== 4) {
      setError("请输入4位PIN码");
      return;
    }

    // TODO: Verify PIN against backend (GET /api/parent/pin)
    if (pin === DEFAULT_PIN) {
      setPin("");
      setError("");
      onSuccess();
    } else {
      setError("PIN码不正确");
    }
  };

  const handleClose = () => {
    setPin("");
    setError("");
    onClose();
  };

  return (
    <View className="pin-overlay">
      <View className="pin-dialog">
        <Text className="pin-title">家长验证</Text>
        <Text className="pin-desc">请输入4位PIN码进入家长模式</Text>

        <View className="pin-input-wrap">
          <Input
            className="pin-input"
            type="number"
            password
            maxlength={4}
            value={pin}
            focus
            onInput={(e) => {
              setPin(e.detail.value);
              setError("");
            }}
            placeholder="****"
            placeholderClass="pin-placeholder"
          />
          {/* Visual dots */}
          <View className="pin-dots">
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                className={`pin-dot ${pin.length > i ? "pin-dot-filled" : ""}`}
              />
            ))}
          </View>
        </View>

        {error && <Text className="pin-error">{error}</Text>}

        <View className="pin-actions">
          <View className="pin-btn pin-btn-cancel" onClick={handleClose}>
            <Text className="pin-btn-text">取消</Text>
          </View>
          <View className="pin-btn pin-btn-confirm" onClick={handleSubmit}>
            <Text className="pin-btn-text-white">确认</Text>
          </View>
        </View>
      </View>
    </View>
  );
}