interface Props {
  onClick: () => void;
}

export function BackButton({ onClick }: Props) {
  return (
    <button className="back-button" onClick={onClick} aria-label="선택 화면으로 돌아가기">
      ← 메뉴
    </button>
  );
}
