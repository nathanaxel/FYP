export class OrderDetails {
  energy_amount: number;
  price: number;
  latitude: string;
  longitude: string;
  sustainability: string;

  constructor(energy_amount: number, price: number, latitude: string, longitude: string, sustainability: string) {
    this.energy_amount = energy_amount;
    this.price = price;
    this.latitude = this.setLatitude(latitude);
    this.longitude = this.setLongitude(longitude);
    this.sustainability = this.setSustainability(sustainability);
  }

  private setLatitude(lat: string) {
    if (lat.length !== 9) throw new Error("Latitude must have exactly 9 characters.");
    return lat;
  }

  private setLongitude(lon: string) {
    if (lon.length !== 9) throw new Error("Longitude must have exactly 9 characters.");
    return lon;
  }

  private setSustainability(s: string){
    if (s.length !== 1) throw new Error("Sustainability grade must have exactly 1 characters.");
    return s;
  }
}