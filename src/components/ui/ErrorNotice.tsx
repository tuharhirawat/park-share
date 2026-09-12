type ErrorNoticeProps = {
  message: string;
};

const ErrorNotice = ({ message }: ErrorNoticeProps) => {
  return (
    <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
};

export default ErrorNotice;