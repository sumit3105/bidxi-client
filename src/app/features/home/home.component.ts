import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  teams = [
    { code: 'MI', name: 'Mumbai Indians', color: '#004BA0' },
    { code: 'CSK', name: 'Chennai Super Kings', color: '#FDB913' },
    { code: 'RCB', name: 'Royal Challengers Bengaluru', color: '#EC1C24' },
    { code: 'KKR', name: 'Kolkata Knight Riders', color: '#3A225D' },
    { code: 'DC', name: 'Delhi Capitals', color: '#0078BC' },
    { code: 'PBKS', name: 'Punjab Kings', color: '#DCDDDF' },
    { code: 'SRH', name: 'Sunrisers Hyderabad', color: '#F26522' },
    { code: 'RR', name: 'Rajasthan Royals', color: '#254AA5' },
    { code: 'GT', name: 'Gujarat Titans', color: '#1B2133' },
    { code: 'LSG', name: 'Lucknow Super Giants', color: '#A72056' }
  ];

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }
}
