import { Component, OnInit } from '@angular/core';
import {
  FooService,
  ConfigService,
  UserService
} from 'app/service';
import { Title }     from '@angular/platform-browser';
@Component({
  selector: 'app-auth-test',
  templateUrl: './auth-test.component.html',
  styleUrls: ['./auth-test.component.scss']
})
export class AuthTestComponent implements OnInit {

  fooResponse = {};
  whoamIResponse = {};
  allUserResponse = {};
  constructor(
	private titleService: Title,
    private config: ConfigService,
    private fooService: FooService,
    private userService: UserService
  ) { }

  ngOnInit() {
	this.titleService.setTitle("Authority Test Page");
  }

  makeRequest(path) {
    if (path === this.config.foo_url) {
      this.fooService.getFoo()
      .subscribe(res => {
        this.forgeResonseObj(this.fooResponse, res, path);
      }, err => {
        this.forgeResonseObj(this.fooResponse, err, path);
      });
    } else if (path === this.config.whoami_url) {
      this.userService.getMyInfo()
      .subscribe(res => {
        this.forgeResonseObj(this.whoamIResponse, res, path);
      }, err => {
        this.forgeResonseObj(this.whoamIResponse, err, path);
      });
    } else {
      this.userService.getAll()
      .subscribe(res => {
        this.forgeResonseObj(this.allUserResponse, res, path);
      }, err => {
        this.forgeResonseObj(this.allUserResponse, err, path);
      });
    }
  }

  forgeResonseObj(obj, res, path) {
    obj['path'] = path;
    obj['method'] = 'GET';
    if (res.ok === false) {
      // err
      obj['status'] = res.status;
      try {
        obj['body'] = JSON.stringify(JSON.parse(res._body), null, 2);
      } catch (err) {
        console.log(res);
        obj['body'] = res.error.message;
      }
    } else {
      // 200
      obj['status'] = 200;
      obj['body'] = JSON.stringify(res, null, 2);
    }
  }

}
