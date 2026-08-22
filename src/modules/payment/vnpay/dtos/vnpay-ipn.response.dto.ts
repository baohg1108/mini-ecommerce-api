export class VnpayIpnResponseDto {
  RspCode!: string;
  Message!: string;

  constructor(rspCode: string, message: string) {
    this.RspCode = rspCode;
    this.Message = message;
  }
}
